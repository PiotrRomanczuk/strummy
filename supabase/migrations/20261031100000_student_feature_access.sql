-- Migration: per-student access to optional features
-- ============================================================================
-- Date: 2026-10-31.
--
-- A new student-facing feature starts hidden, and the teacher turns it on for
-- each student, so a beginner on day one is not overwhelmed. A row means the
-- feature is on for that student; no row means off. Feature keys live in code
-- (lib/config/student-features.ts).
--
-- Staff manage rows and students read their own. Writes are not scoped to a
-- teacher's own students: the app has one teacher, and teacher_students is
-- built from lessons, which would exclude a student before their first lesson.
-- ============================================================================

create table if not exists public.student_feature_access (
  student_id  uuid not null references public.profiles (id) on delete cascade,
  feature_key text not null check (length(feature_key) between 1 and 64),
  enabled_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  primary key (student_id, feature_key)
);

grant select, insert, delete on public.student_feature_access to authenticated;
grant all on public.student_feature_access to service_role;

alter table public.student_feature_access enable row level security;

drop policy if exists student_feature_access_select on public.student_feature_access;
create policy student_feature_access_select on public.student_feature_access
  for select to authenticated
  using (public.is_admin()
         or public.is_teacher()
         or student_id = public.current_profile_id());

drop policy if exists student_feature_access_insert_staff on public.student_feature_access;
create policy student_feature_access_insert_staff on public.student_feature_access
  for insert to authenticated
  with check (public.is_admin() or public.is_teacher());

drop policy if exists student_feature_access_delete_staff on public.student_feature_access;
create policy student_feature_access_delete_staff on public.student_feature_access
  for delete to authenticated
  using (public.is_admin() or public.is_teacher());
