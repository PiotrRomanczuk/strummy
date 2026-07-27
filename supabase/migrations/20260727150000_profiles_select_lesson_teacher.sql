-- Let a student read the profile of whoever actually teaches their lesson,
-- regardless of that person's `is_teacher` flag.
--
-- 20260727140000 restored profiles_select_own_teacher with the stated intent
-- "a student may read the profile of any teacher they share a non-deleted
-- lesson with", but guarded it with `is_teacher = true`. In this product the
-- studio owner is an ADMIN who teaches (is_admin = true, is_teacher = false —
-- see CLAUDE.md "teacher dashboard displays admin view; owner is only
-- teacher"). For every lesson that owner teaches, the guard hid their profile
-- from their own student, so the student's lesson detail rendered
-- "with your teacher" over a link to the student's *own* profile and a
-- Details card reading `Teacher —`.
--
-- The lesson row is the authorization: if you are the student on a non-deleted
-- lesson, you may see who teaches it. Dropping the flag check does not widen
-- exposure beyond that — the EXISTS clause still scopes to profiles that teach
-- this specific student. It removes an ineffective (and misleading) filter,
-- since role flags do not decide who is teacher_id on a lesson.
DROP POLICY IF EXISTS profiles_select_own_teacher ON public.profiles;
CREATE POLICY profiles_select_own_teacher ON public.profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lessons l
      WHERE l.teacher_id = profiles.id
        AND l.student_id = (select public.current_profile_id())
        AND l.deleted_at IS NULL
    )
  );
