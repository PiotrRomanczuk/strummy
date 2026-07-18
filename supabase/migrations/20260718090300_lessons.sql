-- Lessons (minimal core). docs/DATABASE_REBUILD.md Step 3.
-- Numbering owned by the DB trigger (single source of truth) with an advisory lock
-- to close the concurrent-insert gap. RLS carries the 2026-07-15 IDOR scoping from
-- day one: teacher owns write, student reads own.

-- ---------------------------------------------------------------------------
-- Identity helper: caller's profile.id (independent-PK model). SECURITY DEFINER
-- so it bypasses profiles RLS; used by every ownership predicate below.
-- ---------------------------------------------------------------------------
create or replace function public.current_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where user_id = (select auth.uid());
$$;

create table if not exists public.lessons (
  id                    uuid primary key default gen_random_uuid(),
  teacher_id            uuid not null references public.profiles (id) on delete cascade,
  student_id            uuid not null references public.profiles (id) on delete cascade,
  scheduled_at          timestamptz not null,
  title                 text,
  notes                 text,
  status                public.lesson_status not null default 'scheduled',
  lesson_teacher_number integer,
  deleted_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (teacher_id, student_id, lesson_teacher_number)
);

-- FK-backing indexes actually used by list queries.
create index if not exists ix_lessons_teacher on public.lessons (teacher_id) where deleted_at is null;
create index if not exists ix_lessons_student on public.lessons (student_id) where deleted_at is null;

create trigger trg_lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Per-(teacher,student) sequential numbering — the ONLY source (app must not
-- compute it). Advisory lock serializes concurrent inserts for the same pair.
-- ---------------------------------------------------------------------------
create or replace function public.set_lesson_number()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.lesson_teacher_number is null then
    perform pg_advisory_xact_lock(hashtext(new.teacher_id::text || ':' || new.student_id::text));
    select coalesce(max(lesson_teacher_number), 0) + 1
      into new.lesson_teacher_number
      from public.lessons
     where teacher_id = new.teacher_id and student_id = new.student_id;
  end if;
  return new;
end;
$$;

create trigger trg_lessons_set_number
  before insert on public.lessons
  for each row execute function public.set_lesson_number();

-- ---------------------------------------------------------------------------
-- Lesson-access helpers (reused by lesson_songs and future lesson children).
-- ---------------------------------------------------------------------------
create or replace function public.can_access_lesson(p_lesson_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lessons l
    where l.id = p_lesson_id
      and (public.is_admin()
           or l.teacher_id = public.current_profile_id()
           or l.student_id = public.current_profile_id())
  );
$$;

create or replace function public.can_manage_lesson(p_lesson_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.lessons l
    where l.id = p_lesson_id
      and (public.is_admin() or l.teacher_id = public.current_profile_id())
  );
$$;

grant select, insert, update, delete on public.lessons to authenticated;
grant all on public.lessons to service_role;

alter table public.lessons enable row level security;

drop policy if exists lessons_select_participant on public.lessons;
create policy lessons_select_participant on public.lessons
  for select to authenticated
  using (public.is_admin()
         or teacher_id = public.current_profile_id()
         or student_id = public.current_profile_id());

-- Teacher creates only for themselves; admin for anyone.
drop policy if exists lessons_insert_teacher on public.lessons;
create policy lessons_insert_teacher on public.lessons
  for insert to authenticated
  with check (public.is_admin()
              or (public.is_teacher() and teacher_id = public.current_profile_id()));

-- UPDATE/DELETE scoped to the owning teacher (IDOR fix baked in).
drop policy if exists lessons_update_teacher on public.lessons;
create policy lessons_update_teacher on public.lessons
  for update to authenticated
  using (public.is_admin() or teacher_id = public.current_profile_id())
  with check (public.is_admin() or teacher_id = public.current_profile_id());

drop policy if exists lessons_delete_teacher on public.lessons;
create policy lessons_delete_teacher on public.lessons
  for delete to authenticated
  using (public.is_admin() or teacher_id = public.current_profile_id());

-- ---------------------------------------------------------------------------
-- Staff can read profiles (needed to build student pickers for lessons/assignments).
-- MINIMAL SIMPLIFICATION: this lets any teacher read all profiles. Acceptable for
-- the single-teacher CRM; when multi-teacher / per-teacher student scoping lands,
-- narrow this to "students this teacher actually teaches". Additive to the
-- self-only policy from the profiles migration.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select_staff on public.profiles;
create policy profiles_select_staff on public.profiles
  for select to authenticated
  using (public.is_admin_or_teacher());
