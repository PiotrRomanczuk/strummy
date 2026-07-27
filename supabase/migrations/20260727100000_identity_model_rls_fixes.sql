-- Migration: repair identity-model RLS/RPC comparisons, drop legacy status RPC
-- ============================================================================
-- Date: 2026-07-27. Fixes docs/analysis/2026-07-27-migrations-architecture-review.md
-- findings 1, 2, and 8.
--
-- Context (verified against the baseline dump + live dev stack, not re-derived
-- here): profiles.id is an independent PK; profiles.user_id (nullable, unique)
-- is the auth linkage. public.current_profile_id() maps auth.uid() -> profiles.id.
-- assignments.student_id/teacher_id, student_repertoire.student_id,
-- song_status_history.student_id, user_preferences.user_id, and
-- profiles.parent_id all live in PROFILE-ID space (FKs -> profiles(id)) — NOT
-- auth.uid() space. Six migrations shipped since the 20260718 rebuild compared
-- these columns directly against auth.uid(), which fails closed for every
-- organically-signed-up user (handle_new_user assigns profiles.id independently
-- of auth.users.id). It only "worked" because every backfilled profile today
-- happens to have id == user_id — a coincidence the RLS test seeds bake in
-- explicitly, masking the bug from CI. This migration must be correct in BOTH
-- worlds (id == user_id and id != user_id).
--
-- Finding 2: `set_assignment_status` (20260718090500) was superseded by
-- `student_update_assignment_status` (20260719000001), which added the ASG-3
-- transition state machine, but the old function was never dropped and stayed
-- granted to `authenticated` (and, by Postgres's default EXECUTE-to-PUBLIC
-- grant on every new function, to PUBLIC/anon too) — a student could bypass
-- the state machine entirely via the old RPC. Dropped in section 2.
--
-- Finding 8: `fn_aggregate_practice_to_repertoire` and
-- `reverse_song_progress_from_practice` (20260718210000) are SECURITY DEFINER
-- but missing `SET search_path`, violating the chain's own stated convention.
-- Fixed in section 8.
--
-- Finding 1 (helper variant): `is_parent()` and `has_role(user_role)` are
-- baseline-only role helpers that were never redefined by the 20260718090100
-- rebuild (unlike is_admin/is_teacher/is_student/is_admin_or_teacher, which
-- were) and still compare a profiles.id-space value directly to auth.uid().
-- profiles_select_parent (section 7) calls is_parent(), so it must be fixed
-- alongside is_child_of_parent(). Fixed in sections 7b and 7c.
--
-- Idempotent throughout (drop policy/constraint/function if exists, create or
-- replace) so re-applying is safe. Objects not created anywhere in the active
-- migration chain (user_preferences, practice_sessions/student_repertoire,
-- profiles.parent_id — all baseline-only) are guarded with to_regclass /
-- information_schema checks so a fresh chain-only replay does not break.
-- ============================================================================


-- ============================================================================
-- SECTION 1: student RPCs — compare ownership against current_profile_id()
-- ============================================================================
-- Finding 1. student_update_assignment_status / student_toggle_checklist_item /
-- student_complete_chord_drill all validated ownership via
-- `v_assignment.student_id IS DISTINCT FROM auth.uid()` — but student_id is a
-- profiles.id. Bodies are unchanged except for that one comparison per
-- function; state machine, error codes, and validation logic are preserved
-- verbatim.

CREATE OR REPLACE FUNCTION public.student_update_assignment_status(
  p_assignment_id uuid,
  p_new_status public.assignment_status
)
RETURNS public.assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment public.assignments;
  v_allowed boolean;
BEGIN
  SELECT * INTO v_assignment
  FROM public.assignments
  WHERE id = p_assignment_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_assignment.student_id IS DISTINCT FROM public.current_profile_id() THEN
    RAISE EXCEPTION 'Not authorized to update this assignment' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Students may only ever target these two states (mirrors STUDENT_TARGETS
  -- in app/actions/assignment-status.ts).
  IF p_new_status NOT IN ('in_progress', 'completed') THEN
    RAISE EXCEPTION 'Students can only start or complete an assignment' USING ERRCODE = 'check_violation';
  END IF;

  -- No-op transition is always allowed (mirrors validateStatusTransition).
  IF v_assignment.status = p_new_status THEN
    RETURN v_assignment;
  END IF;

  -- Mirrors VALID_STATUS_TRANSITIONS in schemas/AssignmentSchema.ts.
  v_allowed := CASE v_assignment.status
    WHEN 'not_started' THEN p_new_status IN ('in_progress', 'cancelled')
    WHEN 'in_progress' THEN p_new_status IN ('completed', 'cancelled')
    WHEN 'overdue' THEN p_new_status IN ('in_progress', 'completed', 'cancelled')
    ELSE false -- completed / cancelled are terminal
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Invalid status transition from % to %', v_assignment.status, p_new_status
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.assignments
  SET status = p_new_status, updated_at = now()
  WHERE id = p_assignment_id
  RETURNING * INTO v_assignment;

  RETURN v_assignment;
END;
$$;

COMMENT ON FUNCTION public.student_update_assignment_status(uuid, public.assignment_status) IS
  'ASG-3: the only path a student has to mutate assignments. SECURITY DEFINER '
  'validates ownership + the status transition state machine in SQL, then '
  'writes only the status column — RLS no longer trusts app code to scope '
  'which columns a student-submitted UPDATE touches. '
  'Fixed 2026-07-27: ownership check now compares against '
  'public.current_profile_id() instead of auth.uid() — student_id is a '
  'profiles.id, not an auth.users.id (identity-model split, finding 1).';

CREATE OR REPLACE FUNCTION public.student_toggle_checklist_item(
  p_assignment_id uuid,
  p_item_id text,
  p_done boolean
)
RETURNS public.assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment public.assignments;
  v_found boolean;
BEGIN
  SELECT * INTO v_assignment
  FROM public.assignments
  WHERE id = p_assignment_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_assignment.student_id IS DISTINCT FROM public.current_profile_id() THEN
    RAISE EXCEPTION 'Not authorized to update this assignment' USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- The item must already exist; students cannot add items.
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_assignment.checklist) e
    WHERE e->>'id' = p_item_id
  ) INTO v_found;

  IF NOT v_found THEN
    RAISE EXCEPTION 'Checklist item not found' USING ERRCODE = 'no_data_found';
  END IF;

  -- Rebuild the array flipping ONLY the matching item's `done` flag. Text,
  -- ordering, and membership are preserved verbatim, so a student can never
  -- rewrite content through this path.
  UPDATE public.assignments
  SET checklist = (
        SELECT jsonb_agg(
          CASE WHEN e->>'id' = p_item_id
            THEN jsonb_set(e, '{done}', to_jsonb(p_done))
            ELSE e
          END
          ORDER BY ord
        )
        FROM jsonb_array_elements(checklist) WITH ORDINALITY AS t(e, ord)
      ),
      updated_at = now()
  WHERE id = p_assignment_id
  RETURNING * INTO v_assignment;

  RETURN v_assignment;
END;
$$;

COMMENT ON FUNCTION public.student_toggle_checklist_item(uuid, text, boolean) IS
  'The only path a student has to mutate a checklist: flips one existing '
  'item''s done flag by id. Cannot add/remove/reorder items or edit text — '
  'RLS boundary per ADR-0001, mirroring student_update_assignment_status. '
  'Fixed 2026-07-27: ownership check now compares against '
  'public.current_profile_id() instead of auth.uid() (identity-model split, '
  'finding 1).';

CREATE OR REPLACE FUNCTION public.student_complete_chord_drill(
  p_assignment_id uuid,
  p_score integer,
  p_total integer
)
RETURNS public.assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assignment public.assignments;
BEGIN
  SELECT * INTO v_assignment
  FROM public.assignments
  WHERE id = p_assignment_id AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_assignment.student_id IS DISTINCT FROM public.current_profile_id() THEN
    RAISE EXCEPTION 'Not authorized to update this assignment' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_assignment.chord_drill IS NULL THEN
    RAISE EXCEPTION 'Assignment has no chord drill' USING ERRCODE = 'check_violation';
  END IF;

  -- A cancelled assignment is terminal; a drill run cannot revive it.
  IF v_assignment.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot complete a cancelled assignment' USING ERRCODE = 'check_violation';
  END IF;

  IF p_total <= 0 OR p_score < 0 OR p_score > p_total THEN
    RAISE EXCEPTION 'Invalid drill score % of %', p_score, p_total USING ERRCODE = 'check_violation';
  END IF;

  -- Running the drill IS the work, so it completes the assignment directly
  -- (a drill is atomic — no separate "start" step). The result is built
  -- server-side from the validated pair so the payload can carry nothing else.
  UPDATE public.assignments
  SET chord_drill_result = jsonb_build_object(
        'score', p_score,
        'total', p_total,
        'completed_at', now()
      ),
      status = 'completed',
      updated_at = now()
  WHERE id = p_assignment_id
  RETURNING * INTO v_assignment;

  RETURN v_assignment;
END;
$$;

COMMENT ON FUNCTION public.student_complete_chord_drill(uuid, integer, integer) IS
  'ASG-4: the only path a student has to record a chord-drill result. '
  'SECURITY DEFINER validates ownership + that the assignment is a drill, then '
  'writes only chord_drill_result (built from a validated score/total) and '
  'sets status=completed — RLS boundary per ADR-0001, mirroring '
  'student_update_assignment_status and student_toggle_checklist_item. '
  'Fixed 2026-07-27: ownership check now compares against '
  'public.current_profile_id() instead of auth.uid() (identity-model split, '
  'finding 1).';


-- ============================================================================
-- SECTION 2: drop the legacy, state-machine-bypassing status RPC (finding 2)
-- ============================================================================
-- set_assignment_status (20260718090500) was the pre-ASG-3 student write path:
-- it validates ownership correctly (via current_profile_id()) but accepts ANY
-- target public.assignment_status value, with no transition checks. It was
-- superseded by student_update_assignment_status (20260719000001), which adds
-- the ASG-3 state machine. The old function was never dropped and remained
-- GRANTed to `authenticated` (and, by Postgres's implicit EXECUTE-to-PUBLIC
-- default on every new function, effectively reachable by PUBLIC/anon too).
-- Verified unreferenced by any app code (only student_update_assignment_status,
-- student_toggle_checklist_item, student_complete_chord_drill are called) — a
-- pure state-machine bypass with no legitimate caller left to break.

DROP FUNCTION IF EXISTS public.set_assignment_status(uuid, public.assignment_status);


-- ============================================================================
-- SECTION 3: REVOKE hygiene on the surviving student RPCs
-- ============================================================================
-- Postgres grants EXECUTE to PUBLIC on every newly created function by
-- default, regardless of any explicit `GRANT ... TO authenticated` the
-- migration also issued. These RPCs run SECURITY DEFINER against a caller's
-- own assignment via current_profile_id() (auth.uid()-derived) — anon has no
-- auth.uid(), so current_profile_id() resolves to NULL and every ownership
-- check fails closed today, but that safety should not depend on an anonymous
-- caller's session state. Revoke PUBLIC/anon explicitly and grant only to the
-- roles that can plausibly call these: authenticated (real callers) and
-- service_role (admin/cron tooling).

REVOKE ALL ON FUNCTION public.student_update_assignment_status(uuid, public.assignment_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_update_assignment_status(uuid, public.assignment_status) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.student_toggle_checklist_item(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_toggle_checklist_item(uuid, text, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.student_complete_chord_drill(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.student_complete_chord_drill(uuid, integer, integer) TO authenticated, service_role;


-- ============================================================================
-- SECTION 4: assignment_history — profile-id space (finding 1)
-- ============================================================================
-- assignment_history is created by 20260719000004 (in the active chain — no
-- guard needed). Its SELECT policy compared the parent assignment's
-- teacher_id/student_id, and the admin check's profiles.id, against
-- auth.uid() directly; the trigger recorded changed_by as auth.uid(). All
-- three are profile-id-space values.

DROP POLICY IF EXISTS assignment_history_select_own ON public.assignment_history;
CREATE POLICY assignment_history_select_own ON public.assignment_history
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_history.assignment_id
        AND (a.teacher_id = public.current_profile_id() OR a.student_id = public.current_profile_id())
    )
  );

CREATE OR REPLACE FUNCTION public.tr_assignment_history_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.assignment_history (assignment_id, changed_by, change_type, new_data)
    VALUES (NEW.id, public.current_profile_id(), 'created', jsonb_build_object('status', NEW.status));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.assignment_history (
      assignment_id, changed_by, change_type, previous_data, new_data
    )
    VALUES (
      NEW.id,
      public.current_profile_id(),
      'status_changed',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tr_assignment_history_status() IS
  'Logs assignment creation and status transitions to assignment_history (ASG-2). '
  'Fixed 2026-07-27: records public.current_profile_id() (a profiles.id) as '
  'changed_by instead of auth.uid() (identity-model split, finding 1).';

COMMENT ON COLUMN public.assignment_history.changed_by IS
  'Holds a public.profiles(id) value (the actor who triggered the change), '
  'written by tr_assignment_history_status() via current_profile_id(). '
  'Write-only column (no app reader today) — nullable, intentionally no FK. '
  'Fixed 2026-07-27: previously stored auth.uid() (identity-model split, '
  'finding 1).';


-- ============================================================================
-- SECTION 5: user_preferences teacher-read policy — profile-id space
-- ============================================================================
-- Finding 1. user_preferences.user_id references profiles(id), not
-- auth.users(id) — 20260719000006's policy compared it to auth.uid()
-- directly. user_preferences is NOT created anywhere in the active migration
-- chain (baseline-only), so this section is guarded.

DO $$
BEGIN
  IF to_regclass('public.user_preferences') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Teachers can read all preferences" ON public.user_preferences';
    EXECUTE 'DROP POLICY IF EXISTS user_preferences_select_teacher ON public.user_preferences';
    EXECUTE $sql$
      CREATE POLICY user_preferences_select_teacher ON public.user_preferences
        FOR SELECT
        TO authenticated
        USING (public.is_admin_or_teacher());
    $sql$;
  END IF;
END $$;


-- ============================================================================
-- SECTION 6: song_status_history — drop the impossible dual FK, fix policies
-- ============================================================================
-- Finding 1. song_status_history is created by 20260719190000 (in the active
-- chain — no guard needed). Its student_id column carries TWO live FKs (one
-- to auth.users(id), one to profiles(id)) — an insert must satisfy both,
-- which is impossible once profiles.id != auth.uid(). The table is written by
-- an AFTER UPDATE trigger on student_repertoire (fn_record_progress_history,
-- copying student_repertoire.student_id, itself a profiles.id), so a failing
-- insert aborts the whole status-change transaction — the very failure mode
-- 20260719190000 was written to fix. Keep only the profiles(id) FK, and move
-- all three policies into profile-id space.

ALTER TABLE public.song_status_history
  DROP CONSTRAINT IF EXISTS song_status_history_student_id_fkey;

DROP POLICY IF EXISTS "Students can insert their own song status changes" ON public.song_status_history;
CREATE POLICY "Students can insert their own song status changes"
  ON public.song_status_history FOR INSERT
  TO authenticated
  WITH CHECK (student_id = public.current_profile_id());

DROP POLICY IF EXISTS "Students can view their own song status history" ON public.song_status_history;
CREATE POLICY "Students can view their own song status history"
  ON public.song_status_history FOR SELECT
  TO authenticated
  USING (student_id = public.current_profile_id());

DROP POLICY IF EXISTS "Teachers and admins can view all song status history" ON public.song_status_history;
CREATE POLICY "Teachers and admins can view all song status history"
  ON public.song_status_history FOR SELECT
  TO authenticated
  USING (public.is_admin_or_teacher());


-- ============================================================================
-- SECTION 7: is_child_of_parent() + parent-visibility policies — profile-id space
-- ============================================================================
-- Finding 1 (parent variant). is_child_of_parent(_student_id) is a
-- baseline-only function (not created by any active migration) that already
-- compares _student_id against profiles.id correctly, but compared auth.uid()
-- against profiles.parent_id — parent_id is itself a profiles.id, not an
-- auth.users.id. Same bug on the one baseline policy whose predicate compares
-- parent_id directly to auth.uid() (profiles_select_parent). Both
-- profiles.parent_id and these objects are baseline-only, so this whole
-- section is guarded on the column's existence for fresh-chain replay.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'parent_id'
  ) THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.is_child_of_parent(_student_id uuid)
      RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER
      SET search_path TO 'public'
      AS $fn$
        SELECT EXISTS (
          SELECT 1 FROM profiles
          WHERE id = _student_id
            AND parent_id = public.current_profile_id()
        );
      $fn$;
    $sql$;

    EXECUTE 'DROP POLICY IF EXISTS profiles_select_parent ON public.profiles';
    EXECUTE $sql$
      CREATE POLICY profiles_select_parent ON public.profiles
        FOR SELECT
        TO authenticated
        USING (public.is_parent() AND (parent_id = public.current_profile_id()));
    $sql$;
  END IF;
END $$;


-- ============================================================================
-- SECTION 7b: is_parent() — profile-id space (finding 1, helper variant)
-- ============================================================================
-- The baseline's is_parent() checks `profiles.id = auth.uid()` — the same
-- conflation, one level down: section 7's profiles_select_parent policy calls
-- it. The chain's role-helper family (20260718090100) already redefines
-- is_admin/is_teacher/is_student/is_admin_or_teacher via user_id, but is_parent
-- was never redefined and survives on live stacks with the broken body.
-- (The other baseline helpers matching this pattern — is_admin_or_teacher,
-- is_student, is_teacher — are already superseded by the chain and need no fix
-- here.) Guarded: profiles.is_parent is a baseline-only column.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_parent'
  ) THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.is_parent()
      RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER
      SET search_path = public
      AS $fn$
        SELECT EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = (SELECT auth.uid()) AND p.is_parent
        );
      $fn$;
    $sql$;
  END IF;
END $$;


-- ============================================================================
-- SECTION 7c: has_role(user_role) — profile-id space (finding 1, helper variant)
-- ============================================================================
-- has_role(_role) reads public.user_roles, keyed by user_roles.user_id ->
-- profiles(id) (verified FK: user_roles_user_id_fkey references
-- public.profiles(id)) — NOT auth.users(id). The baseline body compares
-- `user_roles.user_id = auth.uid()` directly, the same identity-space bug as
-- is_parent(), one table removed. Not redefined anywhere in the active
-- migration chain (comments on 20260718090100/20260719000004/20260720000002
-- explicitly reject user_roles as this codebase's role convention — profiles
-- booleans are the source of truth — but the baseline function still exists
-- live and is wired up as a callable RPC (lib/api/unified-db.ts:246
-- `rpc.hasRole`), even though nothing currently invokes that wrapper).
-- Fixed via current_profile_id() (the same auth.uid() -> profiles.id mapping
-- used throughout this migration) rather than a raw user_id = (select
-- auth.uid()) comparison, since the column being compared is itself in
-- profile-id space, not auth-id space. Both public.user_roles and
-- public.user_role (the enum type) are baseline-only, so guarded on the
-- table's existence.

DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.has_role(_role public.user_role)
      RETURNS boolean
      LANGUAGE sql STABLE SECURITY DEFINER
      SET search_path = public
      AS $fn$
        SELECT EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = public.current_profile_id()
            AND ur.role = _role
        );
      $fn$;
    $sql$;
  END IF;
END $$;


-- ============================================================================
-- SECTION 8: practice-metric trigger functions — pin search_path (finding 8)
-- ============================================================================
-- fn_aggregate_practice_to_repertoire and reverse_song_progress_from_practice
-- (20260718210000) are SECURITY DEFINER without SET search_path, violating
-- the chain's own stated convention and flagged by the Supabase advisor.
-- Bodies copied EXACTLY from 20260718210000 — only SET search_path = public
-- added. practice_sessions is NOT created anywhere in the active migration
-- chain (baseline-only), so this section is guarded.

DO $$
BEGIN
  IF to_regclass('public.practice_sessions') IS NOT NULL THEN
    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.fn_aggregate_practice_to_repertoire()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      BEGIN
          -- Only aggregate when the session is linked to a specific song
          IF NEW.song_id IS NOT NULL THEN
              UPDATE public.student_repertoire
              SET
                  total_practice_minutes = total_practice_minutes + NEW.duration_minutes,
                  practice_session_count = practice_session_count + 1,
                  last_practiced_at = GREATEST(COALESCE(last_practiced_at, NEW.created_at), NEW.created_at)
              WHERE student_id = NEW.student_id
                AND song_id = NEW.song_id;
          END IF;

          RETURN NEW;
      END;
      $fn$;
    $sql$;

    EXECUTE $sql$
      CREATE OR REPLACE FUNCTION public.reverse_song_progress_from_practice()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $fn$
      BEGIN
          IF OLD.song_id IS NOT NULL THEN
              UPDATE public.student_repertoire SET
                  total_practice_minutes = GREATEST(total_practice_minutes - OLD.duration_minutes, 0),
                  practice_session_count = GREATEST(practice_session_count - 1, 0),
                  last_practiced_at = (
                      SELECT MAX(ps.created_at) FROM public.practice_sessions ps
                      WHERE ps.student_id = OLD.student_id AND ps.song_id = OLD.song_id
                  )
              WHERE student_id = OLD.student_id AND song_id = OLD.song_id;
          END IF;
          RETURN OLD;
      END;
      $fn$;
    $sql$;
  END IF;
END $$;
