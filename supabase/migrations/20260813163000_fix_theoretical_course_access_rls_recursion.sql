-- Fix infinite recursion in RLS policies between theoretical_courses and
-- theoretical_course_access.
--
-- theoretical_courses.tc_select_student references theoretical_course_access
-- (EXISTS subquery), and theoretical_course_access.tca_select_teacher
-- references theoretical_courses back (EXISTS subquery on created_by). When
-- Postgres plans a SELECT on theoretical_courses, evaluating the
-- tc_select_student branch pulls in RLS on theoretical_course_access, whose
-- tca_select_teacher branch pulls RLS on theoretical_courses again -> infinite
-- recursion (Postgres error 42P17). This makes getTheoryCourses() fail for
-- every request, regardless of what data exists, and the app silently
-- swallows the error and renders "0 courses".
--
-- Fix: follow the existing SECURITY DEFINER helper-function pattern already
-- used by current_profile_id()/is_admin()/is_teacher() (see ADR-0001 -- the DB
-- is the security boundary) to check "is this profile the teacher who created
-- this course" without re-entering RLS on theoretical_courses.

create or replace function public.is_theory_course_owner(p_course_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.theoretical_courses tc
    where tc.id = p_course_id
      and tc.created_by = public.current_profile_id()
  );
$$;

comment on function public.is_theory_course_owner(uuid) is
  'SECURITY DEFINER helper so theoretical_course_access RLS policies can check course ownership without re-triggering RLS on theoretical_courses (avoids infinite recursion, see migration name).';

drop policy if exists tca_select_teacher on public.theoretical_course_access;

create policy tca_select_teacher on public.theoretical_course_access
  for select
  to authenticated
  using (public.is_theory_course_owner(course_id));

drop policy if exists tca_delete on public.theoretical_course_access;

create policy tca_delete on public.theoretical_course_access
  for delete
  to authenticated
  using (public.is_theory_course_owner(course_id) or (select public.is_admin()));
