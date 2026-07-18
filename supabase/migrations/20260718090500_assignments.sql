-- Assignments (minimal core). docs/DATABASE_REBUILD.md Step 5.
-- Teacher owns write; student reads own and can change ONLY status (via the
-- set_assignment_status function, not a direct table UPDATE — column-level
-- restriction between two users sharing the `authenticated` role can't be a grant).

create table if not exists public.assignments (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  lesson_id   uuid references public.lessons (id) on delete set null,
  song_id     uuid references public.songs (id) on delete set null,
  title       text,
  description text,
  status      public.assignment_status not null default 'not_started',
  due_date    date,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists ix_assignments_teacher on public.assignments (teacher_id) where deleted_at is null;
create index if not exists ix_assignments_student on public.assignments (student_id) where deleted_at is null;

create trigger trg_assignments_set_updated_at
  before update on public.assignments
  for each row execute function public.set_updated_at();

-- Student status update: SECURITY DEFINER, scoped to the caller's own assignment,
-- touches only `status`. Keeps students off direct table UPDATE.
create or replace function public.set_assignment_status(p_id uuid, p_status public.assignment_status)
returns public.assignments language plpgsql security definer set search_path = public as $$
declare
  v_row public.assignments;
begin
  update public.assignments
     set status = p_status
   where id = p_id and student_id = public.current_profile_id() and deleted_at is null
   returning * into v_row;
  if not found then
    raise exception 'assignment % not updatable by current student', p_id using errcode = 'check_violation';
  end if;
  return v_row;
end;
$$;

grant select, insert, update, delete on public.assignments to authenticated;
grant all on public.assignments to service_role;
grant execute on function public.set_assignment_status(uuid, public.assignment_status) to authenticated;

alter table public.assignments enable row level security;

drop policy if exists assignments_select_participant on public.assignments;
create policy assignments_select_participant on public.assignments
  for select to authenticated
  using (public.is_admin()
         or teacher_id = public.current_profile_id()
         or student_id = public.current_profile_id());

drop policy if exists assignments_insert_teacher on public.assignments;
create policy assignments_insert_teacher on public.assignments
  for insert to authenticated
  with check (public.is_admin()
              or (public.is_teacher() and teacher_id = public.current_profile_id()));

-- Direct UPDATE/DELETE = owning teacher (or admin). Students use set_assignment_status.
drop policy if exists assignments_update_teacher on public.assignments;
create policy assignments_update_teacher on public.assignments
  for update to authenticated
  using (public.is_admin() or teacher_id = public.current_profile_id())
  with check (public.is_admin() or teacher_id = public.current_profile_id());

drop policy if exists assignments_delete_teacher on public.assignments;
create policy assignments_delete_teacher on public.assignments
  for delete to authenticated
  using (public.is_admin() or teacher_id = public.current_profile_id());
