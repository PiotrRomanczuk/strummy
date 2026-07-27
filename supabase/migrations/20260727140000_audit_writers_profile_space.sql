-- Migration: audit/history writer functions → profile-id space
-- ============================================================================
-- Date: 2026-07-27. Final member of the finding-1 family, caught live by the
-- new divergent-identity RLS lock: the audit trigger functions write
-- audit_log.actor_id (FK → profiles(id)) and lesson_history.changed_by as
-- auth.uid(). Once a profile has id <> user_id, that FK aborts EVERY
-- INSERT/UPDATE/DELETE on assignments, lessons, profiles and
-- student_repertoire — the audit trigger takes the whole transaction down.
-- Repointed to public.current_profile_id(). current_user_roles() (helper,
-- same conflation) now resolves via user_id. Definitions otherwise verbatim
-- from the live stack (pg_get_functiondef).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.audit_log_changes(p_entity_type audit_entity, p_entity_id uuid, p_action audit_action, p_changes jsonb, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes, metadata)
    VALUES (p_entity_type, p_entity_id, public.current_profile_id(), p_action, p_changes, p_metadata)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.current_user_roles()
 RETURNS TABLE(is_admin boolean, is_teacher boolean, is_student boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    SELECT
        COALESCE(is_admin, false),
        COALESCE(is_teacher, false),
        COALESCE(is_student, false)
    FROM profiles
    WHERE user_id = (select auth.uid());
$function$
;
CREATE OR REPLACE FUNCTION public.tr_audit_assignments()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_action audit_action;
    v_changes jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_action := 'status_changed';
        ELSE
            v_action := 'updated';
        END IF;
        v_changes := jsonb_build_object(
            'old', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW))),
            'new', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(NEW), to_jsonb(OLD)))
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'deleted';
        v_changes := to_jsonb(OLD);
        INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
        VALUES ('assignment', OLD.id, public.current_profile_id(), v_action, v_changes);
        RETURN OLD;
    END IF;

    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
    VALUES ('assignment', NEW.id, public.current_profile_id(), v_action, v_changes);

    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.tr_audit_lessons()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_action audit_action;
    v_changes jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            IF NEW.status = 'CANCELLED' THEN
                v_action := 'cancelled';
            ELSIF NEW.status = 'COMPLETED' THEN
                v_action := 'completed';
            ELSIF NEW.status = 'RESCHEDULED' THEN
                v_action := 'rescheduled';
            ELSE
                v_action := 'status_changed';
            END IF;
        ELSIF OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at THEN
            v_action := 'rescheduled';
        ELSE
            v_action := 'updated';
        END IF;
        v_changes := jsonb_build_object(
            'old', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW))),
            'new', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(NEW), to_jsonb(OLD)))
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'deleted';
        v_changes := to_jsonb(OLD);
        INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
        VALUES ('lesson', OLD.id, public.current_profile_id(), v_action, v_changes);
        RETURN OLD;
    END IF;

    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
    VALUES ('lesson', NEW.id, public.current_profile_id(), v_action, v_changes);

    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.tr_audit_profiles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_action audit_action;
    v_changes jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        IF (OLD.is_admin IS DISTINCT FROM NEW.is_admin) OR
           (OLD.is_teacher IS DISTINCT FROM NEW.is_teacher) OR
           (OLD.is_student IS DISTINCT FROM NEW.is_student) THEN
            v_action := 'role_changed';
        ELSE
            v_action := 'updated';
        END IF;
        v_changes := jsonb_build_object(
            'old', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW))),
            'new', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(NEW), to_jsonb(OLD)))
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'deleted';
        v_changes := to_jsonb(OLD);
        INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
        VALUES ('profile', OLD.id, public.current_profile_id(), v_action, v_changes);
        RETURN OLD;
    END IF;

    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
    VALUES ('profile', NEW.id, public.current_profile_id(), v_action, v_changes);

    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.tr_audit_song_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_action audit_action;
    v_changes jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_action := 'status_changed';
        ELSE
            v_action := 'updated';
        END IF;
        v_changes := jsonb_build_object(
            'old', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW))),
            'new', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(NEW), to_jsonb(OLD)))
        );
    END IF;

    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
    VALUES ('song_progress', NEW.id, public.current_profile_id(), v_action, v_changes);

    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.track_lesson_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    change_type_value TEXT;
    previous_data_value JSONB;
    new_data_value JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        change_type_value := 'created';
        previous_data_value := NULL;
        new_data_value := to_jsonb(NEW);

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            IF NEW.status = 'cancelled'  THEN change_type_value := 'cancelled';
            ELSIF NEW.status = 'completed' THEN change_type_value := 'completed';
            ELSE change_type_value := 'status_changed';
            END IF;
        ELSIF OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at THEN
            change_type_value := 'rescheduled';
        ELSE
            change_type_value := 'updated';
        END IF;
        previous_data_value := to_jsonb(OLD);
        new_data_value := to_jsonb(NEW);

    ELSIF TG_OP = 'DELETE' THEN
        -- AFTER DELETE: the lesson row is already gone so the FK on
        -- lesson_history.lesson_id would fail. Best-effort: log and continue.
        BEGIN
            INSERT INTO lesson_history (lesson_id, changed_by, change_type, previous_data, new_data, changed_at)
            VALUES (OLD.id, COALESCE(public.current_profile_id(), OLD.teacher_id), 'deleted', to_jsonb(OLD), to_jsonb(OLD), now());
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'track_lesson_changes DELETE audit skipped for lesson %: %', OLD.id, SQLERRM;
        END;
        RETURN OLD;
    END IF;

    INSERT INTO lesson_history (lesson_id, changed_by, change_type, previous_data, new_data, changed_at)
    VALUES (NEW.id, COALESCE(public.current_profile_id(), NEW.teacher_id), change_type_value, previous_data_value, new_data_value, now());

    RETURN NEW;
END;
$function$
;

-- ============================================================================
-- ADDENDUM: student-reads-own-teacher profiles policy (sweep regression)
-- ============================================================================
-- 20260727130000 dropped the legacy profiles_select_own_teacher (it compared
-- teacher_teaches_student(id, auth.uid()) — mixed spaces) without a canonical
-- replacement, leaving students unable to read their own teacher's profile
-- (caught by profiles.rls.test.ts). Canonical form: a student may read the
-- profile of any teacher they share a non-deleted lesson with.
DROP POLICY IF EXISTS profiles_select_own_teacher ON public.profiles;
CREATE POLICY profiles_select_own_teacher ON public.profiles
  FOR SELECT TO authenticated
  USING (
    is_teacher = true
    AND EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.teacher_id = profiles.id
        AND l.student_id = (select public.current_profile_id())
        AND l.deleted_at IS NULL
    )
  );
