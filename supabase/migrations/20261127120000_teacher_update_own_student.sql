-- A teacher may edit and archive the students they teach (#1178).
--
-- profiles_update_own admits only the row owner and admins, and
-- trg_profiles_guard_self_update refuses every non-admin change outside the
-- self-edit columns, so a teacher could not fix a student's name, level or
-- schedule, nor archive them. Widening the policy would hand the teacher every
-- column of the row (role flags included), so the write goes through one
-- SECURITY DEFINER function instead (ADR-0001):
--
--   * the caller is an admin, or a teacher who teaches the student (a
--     non-deleted lesson together: the teacher_students definition);
--   * the target is a student and nothing else: no admin, no teacher;
--   * only the student-card columns below can change. Any other key in
--     p_changes (is_admin, is_teacher, is_active, parent_id, email, user_id …)
--     is refused, not ignored, so a caller cannot believe a change was saved.
--
-- profiles.notes still feeds trg_profiles_move_private_notes (#1096); the
-- caller's auth.uid() is visible inside this function, so the note lands in
-- student_private_notes as it does for an admin.
--
-- Additive: one new function. Safe to re-run.

create or replace function public.teacher_update_student(p_student_id uuid, p_changes jsonb)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_editable constant text[] := array[
    'full_name', 'phone', 'skill_level', 'instrument', 'start_date', 'avatar_color',
    'parent_name', 'parent_email', 'lesson_day_of_week', 'lesson_time_local',
    'lesson_duration_minutes', 'lesson_rate', 'billing_cycle', 'notes', 'student_status'
  ];
  v_refused text[];
  v_row public.profiles;
begin
  if (select auth.uid()) is null then
    raise exception 'teacher_update_student: not signed in' using errcode = '42501';
  end if;

  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'teacher_update_student: changes must be an object' using errcode = '22023';
  end if;

  select array_agg(k) into v_refused
  from jsonb_object_keys(p_changes) as k
  where k <> all (v_editable);
  if v_refused is not null then
    raise exception 'teacher_update_student: field not editable: %', array_to_string(v_refused, ', ')
      using errcode = '42501';
  end if;

  if not (
    public.is_admin()
    or (
      public.is_teacher()
      and exists (
        select 1 from public.lessons l
        where l.student_id = p_student_id
          and l.teacher_id = public.current_profile_id()
          and l.deleted_at is null
      )
    )
  ) then
    raise exception 'teacher_update_student: not your student' using errcode = '42501';
  end if;

  select * into v_row from public.profiles
  where id = p_student_id and is_student and not is_admin and not is_teacher
  for update;
  if not found then
    raise exception 'teacher_update_student: not your student' using errcode = '42501';
  end if;

  -- Keys absent from p_changes keep the stored value; present ones are cast to
  -- the column type by Postgres (a bad value fails the whole call).
  v_row := jsonb_populate_record(v_row, p_changes);

  update public.profiles p set
    full_name = v_row.full_name,
    phone = v_row.phone,
    skill_level = v_row.skill_level,
    instrument = v_row.instrument,
    start_date = v_row.start_date,
    avatar_color = v_row.avatar_color,
    parent_name = v_row.parent_name,
    parent_email = v_row.parent_email,
    lesson_day_of_week = v_row.lesson_day_of_week,
    lesson_time_local = v_row.lesson_time_local,
    lesson_duration_minutes = v_row.lesson_duration_minutes,
    lesson_rate = v_row.lesson_rate,
    billing_cycle = v_row.billing_cycle,
    notes = v_row.notes,
    student_status = v_row.student_status,
    updated_at = now()
  where p.id = p_student_id;
end;
$$;

comment on function public.teacher_update_student(uuid, jsonb) is
  'Teacher (or admin) edits the student-card fields of a student they teach, including archiving (student_status). Refuses role flags and any other column (#1178).';

revoke execute on function public.teacher_update_student(uuid, jsonb) from public, anon;
grant execute on function public.teacher_update_student(uuid, jsonb) to authenticated, service_role;
