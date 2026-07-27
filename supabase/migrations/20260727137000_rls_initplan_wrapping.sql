-- Migration: InitPlan-wrap the remaining chain policies (finding 10)
-- ============================================================================
-- Date: 2026-07-27. docs/analysis/2026-07-27-migrations-architecture-review.md
-- finding 10: SECURITY DEFINER helpers are not inlined, so a bare
-- public.is_admin() / public.current_profile_id() in a policy predicate runs
-- once PER ROW. Wrapping the call in a scalar subquery — (select helper()) —
-- makes it an InitPlan, evaluated once per statement (Supabase's own RLS
-- performance guidance).
--
-- 20260727130000 already re-asserted the six chain-owned tables' policies in
-- wrapped form. This migration wraps the remainder: teacher_settings
-- (20260723130000) and the policies (re)created by 20260727100000. Predicates
-- are semantically identical to their sources — only the wrapping changes.
--
-- NOT wrapped (deliberate): policies calling is_child_of_parent(<row col>) or
-- can_access_lesson(lesson_id) — the argument depends on the row, so a
-- scalar subquery stays correlated and per-row; wrapping buys nothing.
-- ============================================================================

-- ---- teacher_settings (20260723130000) --------------------------------------
DROP POLICY IF EXISTS teacher_settings_select ON public.teacher_settings;
CREATE POLICY teacher_settings_select ON public.teacher_settings
  FOR SELECT TO authenticated
  USING ((select public.is_admin()) OR (select public.is_teacher())
         OR profile_id = (select public.current_profile_id()));

DROP POLICY IF EXISTS teacher_settings_insert ON public.teacher_settings;
CREATE POLICY teacher_settings_insert ON public.teacher_settings
  FOR INSERT TO authenticated
  WITH CHECK ((select public.is_admin())
              OR ((select public.is_teacher())
                  AND profile_id = (select public.current_profile_id())));

DROP POLICY IF EXISTS teacher_settings_update ON public.teacher_settings;
CREATE POLICY teacher_settings_update ON public.teacher_settings
  FOR UPDATE TO authenticated
  USING ((select public.is_admin()) OR profile_id = (select public.current_profile_id()))
  WITH CHECK ((select public.is_admin()) OR profile_id = (select public.current_profile_id()));

DROP POLICY IF EXISTS teacher_settings_delete ON public.teacher_settings;
CREATE POLICY teacher_settings_delete ON public.teacher_settings
  FOR DELETE TO authenticated
  USING ((select public.is_admin()) OR profile_id = (select public.current_profile_id()));

-- ---- assignment_history (20260727100000 §4) ---------------------------------
DROP POLICY IF EXISTS assignment_history_select_own ON public.assignment_history;
CREATE POLICY assignment_history_select_own ON public.assignment_history
  FOR SELECT TO authenticated
  USING (
    (select public.is_admin())
    OR EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_history.assignment_id
        AND (a.teacher_id = (select public.current_profile_id())
             OR a.student_id = (select public.current_profile_id()))
    )
  );

-- ---- user_preferences teacher read (20260727100000 §5) ----------------------
DROP POLICY IF EXISTS user_preferences_select_teacher ON public.user_preferences;
CREATE POLICY user_preferences_select_teacher ON public.user_preferences
  FOR SELECT TO authenticated
  USING ((select public.is_admin_or_teacher()));

-- ---- song_status_history (20260727100000 §6) --------------------------------
DROP POLICY IF EXISTS "Students can insert their own song status changes" ON public.song_status_history;
CREATE POLICY "Students can insert their own song status changes"
  ON public.song_status_history FOR INSERT
  TO authenticated
  WITH CHECK (student_id = (select public.current_profile_id()));

DROP POLICY IF EXISTS "Students can view their own song status history" ON public.song_status_history;
CREATE POLICY "Students can view their own song status history"
  ON public.song_status_history FOR SELECT
  TO authenticated
  USING (student_id = (select public.current_profile_id()));

DROP POLICY IF EXISTS "Teachers and admins can view all song status history" ON public.song_status_history;
CREATE POLICY "Teachers and admins can view all song status history"
  ON public.song_status_history FOR SELECT
  TO authenticated
  USING ((select public.is_admin_or_teacher()));

-- ---- profiles_select_parent (20260727100000 §7) -----------------------------
DROP POLICY IF EXISTS profiles_select_parent ON public.profiles;
CREATE POLICY profiles_select_parent ON public.profiles
  FOR SELECT TO authenticated
  USING ((select public.is_parent()) AND parent_id = (select public.current_profile_id()));
