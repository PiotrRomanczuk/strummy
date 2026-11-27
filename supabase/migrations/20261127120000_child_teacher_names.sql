-- The names of a child's teachers, for the child's parent (#1092).
--
-- A parent reads their child's lessons (lessons_select_parent) but not the
-- profile of the teacher on them: profiles_select_own_teacher covers only the
-- student. The family dashboard therefore showed no teacher at all. Instead of
-- a SELECT policy on profiles — which would hand the parent the teacher's whole
-- row; see #1096 for the same problem with the child's row — this function
-- returns two columns, id and full_name, and only for profiles that teach a
-- non-deleted lesson of a child linked to the caller.
--
-- The lesson is the authorization, as in profiles_select_own_teacher: no
-- is_teacher check, because the studio owner teaches as an admin.
-- Empty for anyone who is not the child's parent (is_child_of_parent).

create or replace function public.child_teacher_names(p_child_id uuid)
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select distinct p.id, p.full_name
  from public.lessons l
  join public.profiles p on p.id = l.teacher_id
  where l.student_id = p_child_id
    and l.deleted_at is null
    and p.full_name is not null
    and public.is_child_of_parent(p_child_id);
$$;

revoke all on function public.child_teacher_names(uuid) from public;
revoke all on function public.child_teacher_names(uuid) from anon;
grant execute on function public.child_teacher_names(uuid) to authenticated;
