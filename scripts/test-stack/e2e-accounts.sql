-- E2E role accounts on StrummyTest: the same four logins, roles and profile
-- fields the dev stack has (playwright.config.ts, tests/fixtures/auth.fixture.ts),
-- so the Playwright suite runs here unchanged.
--
-- NOT the dev passwords: those sit in a public repo, and this database is a copy
-- of production. All four get the shared test password (Bitwarden
-- strummy-test-users) from the psql variable :test_password — the E2E env
-- passes it as TEST_*_PASSWORD (scripts/test-stack/e2e-env.sh).
--
-- Run by refresh.sh after the anonymisation (these rows are not real data, so
-- they come after its "nothing real is left" check). Idempotent: re-running
-- resets the four accounts to this state.
--
-- Mechanics as in scripts/database/seeding/demo/emit-demo-sql.ts: auth.users +
-- auth.identities like GoTrue writes them (empty strings, never NULL, in the
-- token columns — a NULL makes every sign-in fail), handle_new_user mints the
-- profile, then the profile gets the dev account's fields.
\set ON_ERROR_STOP on
begin;

create temp table _roles (
  email text primary key, full_name text, first_name text, last_name text,
  is_admin boolean, is_teacher boolean, is_student boolean, is_parent boolean
) on commit drop;
-- Read from StrummyDevelopment on 2026-11-15.
insert into _roles values
  ('admin@dev.local',   'Dev Admin',       null,    null,       true,  false, false, false),
  ('teacher@dev.local', 'Sarah Mitchell',  'Sarah', 'Mitchell', false, true,  false, false),
  ('student@dev.local', 'Emma Wright E2E', 'Emma',  'Wright',   false, false, true,  false),
  ('parent@dev.local',  'Dev Parent',      null,    null,       false, false, false, true);

with created as (
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change, email_change_token_new,
                          email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  select gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', r.email,
         extensions.crypt(:'test_password', extensions.gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb,
         jsonb_build_object('full_name', r.full_name, 'email_verified', true), now(), now(),
         '', '', '', '', '', '', '', ''
    from _roles r
   where not exists (select 1 from auth.users u where u.email = r.email)
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, provider, identity_data, created_at, updated_at, last_sign_in_at)
select gen_random_uuid(), c.id, c.id::text, 'email',
       jsonb_build_object('sub', c.id::text, 'email', c.email, 'email_verified', true, 'phone_verified', false),
       now(), now(), now()
  from created c;

-- Accounts that already existed (a re-run): the current test password, healed token columns.
update auth.users u
   set encrypted_password = extensions.crypt(:'test_password', extensions.gen_salt('bf')),
       email_confirmed_at = coalesce(u.email_confirmed_at, now()),
       confirmation_token = coalesce(u.confirmation_token, ''),
       recovery_token = coalesce(u.recovery_token, ''),
       email_change = coalesce(u.email_change, ''),
       email_change_token_new = coalesce(u.email_change_token_new, ''),
       email_change_token_current = coalesce(u.email_change_token_current, ''),
       phone_change = coalesce(u.phone_change, ''),
       phone_change_token = coalesce(u.phone_change_token, ''),
       reauthentication_token = coalesce(u.reauthentication_token, ''),
       banned_until = null,
       updated_at = now()
  from _roles r
 where u.email = r.email;

update public.profiles p
   set email = r.email, full_name = r.full_name, first_name = r.first_name, last_name = r.last_name,
       is_admin = r.is_admin, is_teacher = r.is_teacher, is_student = r.is_student, is_parent = r.is_parent,
       is_active = true, is_shadow = false, is_development = false, locale = 'en',
       student_status = 'archived', onboarding_completed = false,
       failed_login_attempts = 0, locked_until = null
  from _roles r join auth.users u on u.email = r.email
 where p.user_id = u.id;

-- The student's own fields, and the parent link tests/e2e/parent/* relies on.
update public.profiles s
   set phone = '', instrument = 'Guitar', skill_level = 'beginner', avatar_color = '#c89523',
       billing_cycle = 'monthly', lesson_day_of_week = 4, lesson_duration_minutes = 45,
       parent_id = (select id from public.profiles where email = 'parent@dev.local')
 where s.email = 'student@dev.local';

-- teacher@dev.local teaches student@dev.local. A teacher's student list
-- (lesson form, quick assign, roster) is the view teacher_students = distinct
-- teacher/student pairs of lessons, and on dev that pair exists only because
-- of the dev-studio seed. One completed lesson makes it explicit here.
insert into public.lessons (teacher_id, student_id, scheduled_at, title, status, notes)
select t.id, s.id, now() - interval '7 days', 'First lesson (test-stack fixture)', 'COMPLETED', 'seed:e2e-accounts'
  from public.profiles t, public.profiles s
 where t.email = 'teacher@dev.local' and s.email = 'student@dev.local'
   and not exists (select 1 from public.lessons l
                    where l.teacher_id = t.id and l.student_id = s.id and l.notes = 'seed:e2e-accounts');

do $guard$
declare n int;
begin
  select count(*) into n
    from _roles r join auth.users u on u.email = r.email join public.profiles p on p.user_id = u.id
   where p.is_admin = r.is_admin and p.is_teacher = r.is_teacher
     and p.is_student = r.is_student and p.is_parent = r.is_parent;
  if n <> 4 then raise exception 'expected 4 E2E role accounts, got %', n; end if;
  if (select parent_id from public.profiles where email = 'student@dev.local') is null then
    raise exception 'student@dev.local has no parent link';
  end if;
  if not exists (select 1 from public.teacher_students ts
                   join public.profiles t on t.id = ts.teacher_id
                   join public.profiles s on s.id = ts.student_id
                  where t.email = 'teacher@dev.local' and s.email = 'student@dev.local') then
    raise exception 'teacher@dev.local does not teach student@dev.local';
  end if;
end $guard$;

commit;
