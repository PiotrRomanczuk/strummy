-- 2026-10-20 — Hide the demo cohort from real users.
--
-- Production keeps the public "Try the demo" cohort (`*@strummy.app`,
-- profiles.is_development = true; lib/demo/demo-accounts.constants.ts). The
-- owner — admin + teacher, is_development = false — does not want those
-- fictional people in the roster, lesson lists, assignments, repertoire or
-- practice views. With 164 `from('profiles')` and 127 `from('lessons')` call
-- sites, filtering in the app is a losing game; the database is the security
-- boundary (ADR-0001), so the rule lives here.
--
-- Mechanism: one RESTRICTIVE SELECT policy per table. Restrictive policies AND
-- with every existing permissive one, so nothing a user could not see before
-- becomes visible — rows only disappear. A viewer whose own profile is
-- is_development (the demo teacher / student, and every RLS-test seed user —
-- lib/testing/rls/seedUser.ts sets is_development: true) is exempt and keeps
-- seeing exactly what the permissive policies grant. Service-role bypasses RLS
-- as always (crons, admin tooling).
--
-- Idempotent: safe to re-apply.

create or replace function public.is_development_viewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_development from public.profiles p where p.user_id = auth.uid() limit 1),
    false
  );
$$;

comment on function public.is_development_viewer() is
  'True when the signed-in user''s own profile is is_development (demo / test seed). Used by the hide_demo_* restrictive policies.';

revoke all on function public.is_development_viewer() from public;
grant execute on function public.is_development_viewer() to authenticated, anon, service_role;

-- Looking profiles up from inside a lessons/assignments policy as the calling
-- user recurses: profiles_select_own_teacher itself queries lessons
-- ("infinite recursion detected in policy", 42P17 — seen on dev 2026-10-20).
-- A SECURITY DEFINER lookup runs as the table owner (bypassrls), so it does
-- not re-enter RLS — the same reason is_admin()/current_profile_id() exist.
create or replace function public.is_demo_profile(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_development from public.profiles p where p.id = profile_id),
    false
  );
$$;

comment on function public.is_demo_profile(uuid) is
  'True when the given profiles.id is is_development (demo / test seed). RLS-safe lookup for the hide_demo_* policies.';

revoke all on function public.is_demo_profile(uuid) from public;
grant execute on function public.is_demo_profile(uuid) to authenticated, anon, service_role;

-- profiles: a demo profile is visible only to demo viewers.
drop policy if exists hide_demo_profiles on public.profiles;
create policy hide_demo_profiles on public.profiles
  as restrictive for select
  using (not coalesce(is_development, false) or (select public.is_development_viewer()));

-- lessons / assignments: hidden when either participant is a demo profile —
-- unless the viewer IS a participant. A row you are party to is your own data
-- and stays visible whoever the other side is. Without this, a real student
-- whose teacher happens to be is_development (dev stack: the shadow-claim E2E
-- picks "any teacher", and every seeded teacher is is_development) lost their
-- lessons on 2026-10-20. On production no real user has a demo counterpart,
-- so the exemption changes nothing there.
drop policy if exists hide_demo_lessons on public.lessons;
create policy hide_demo_lessons on public.lessons
  as restrictive for select
  using (
    (select public.is_development_viewer())
    or teacher_id = (select public.current_profile_id())
    or student_id = (select public.current_profile_id())
    or not (public.is_demo_profile(teacher_id) or public.is_demo_profile(student_id))
  );

drop policy if exists hide_demo_assignments on public.assignments;
create policy hide_demo_assignments on public.assignments
  as restrictive for select
  using (
    (select public.is_development_viewer())
    or teacher_id = (select public.current_profile_id())
    or student_id = (select public.current_profile_id())
    or not (public.is_demo_profile(teacher_id) or public.is_demo_profile(student_id))
  );

-- student-owned rows: hidden when the student is a demo profile (your own
-- rows are never hidden from you).
drop policy if exists hide_demo_student_repertoire on public.student_repertoire;
create policy hide_demo_student_repertoire on public.student_repertoire
  as restrictive for select
  using (
    (select public.is_development_viewer())
    or student_id = (select public.current_profile_id())
    or not public.is_demo_profile(student_id)
  );

drop policy if exists hide_demo_practice_sessions on public.practice_sessions;
create policy hide_demo_practice_sessions on public.practice_sessions
  as restrictive for select
  using (
    (select public.is_development_viewer())
    or student_id = (select public.current_profile_id())
    or not public.is_demo_profile(student_id)
  );
