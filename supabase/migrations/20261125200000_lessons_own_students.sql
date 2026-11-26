-- A teacher may give a lesson only to a student they already teach, or to a student nobody teaches yet
-- (a new student's first lesson). Admins are unrestricted.
--
-- Until now the insert policy only pinned teacher_id to the caller, so a teacher could attach a lesson to any
-- student profile id, and a lesson is exactly what makes a teacher "teach" a student (the teacher_students view,
-- StudentAccess). The update policy had the same gap for moving one of the teacher's own lessons to another
-- student. Every teacher-side insert path (lesson form, /api/lessons, bulk, schedule, recurring) writes with the
-- caller's client, so the policy is the one place that covers them all (ADR-0001).
--
-- The check needs other teachers' lessons, which RLS hides from the caller, hence SECURITY DEFINER. It answers
-- one bit about a student id the caller already holds; a profile id is not guessable.
--
-- Additive: one new function; the two policies are dropped and recreated in this file.

create or replace function public.may_teach_student(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
      select 1 from public.lessons l
      where l.student_id = p_student_id
        and l.deleted_at is null
        and l.teacher_id = public.current_profile_id()
    )
    or not exists (
      select 1 from public.lessons l
      where l.student_id = p_student_id
        and l.deleted_at is null
    );
$$;

comment on function public.may_teach_student(uuid) is
  'True when the caller already teaches the student (a non-deleted lesson together) or nobody does. Used by the lessons insert/update policies so a teacher cannot take over another teacher''s student.';

revoke execute on function public.may_teach_student(uuid) from public, anon;
grant execute on function public.may_teach_student(uuid) to authenticated, service_role;

drop policy if exists lessons_insert_teacher on public.lessons;
create policy lessons_insert_teacher on public.lessons
  for insert to authenticated
  with check (
    (select public.is_admin())
    or (
      (select public.is_teacher())
      and teacher_id = (select public.current_profile_id())
      and public.may_teach_student(student_id)
    )
  );

drop policy if exists lessons_update_teacher on public.lessons;
create policy lessons_update_teacher on public.lessons
  for update to authenticated
  using ((select public.is_admin()) or teacher_id = (select public.current_profile_id()))
  with check (
    (select public.is_admin())
    or (
      teacher_id = (select public.current_profile_id())
      and public.may_teach_student(student_id)
    )
  );
