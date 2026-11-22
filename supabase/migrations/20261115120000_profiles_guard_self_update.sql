-- Migration: a non-admin may edit only display/contact fields on their own profile
-- ============================================================================
-- Date: 2026-11-15.
--
-- Hole: `profiles_update_own` limits the ROW (`user_id = auth.uid() OR
-- is_admin()`), not the COLUMNS, and `authenticated` has UPDATE on every
-- column. Any signed-in user could PATCH their own profile with
-- `{"is_admin": true}` and the role helpers (`is_admin()`, `is_teacher()`, ...)
-- read those flags from this very table, so one request granted the whole
-- database. The same hole let a student change their own lesson_rate,
-- parent_id or student_status.
--
-- Why a trigger: a policy's WITH CHECK cannot see OLD, so it cannot say
-- "unchanged". Column grants would also cut off admins, who write through the
-- same `authenticated` role (app/api/users/[id]/route.ts).
--
-- The list is an ALLOW list, so a column added later is protected by default.
-- Unaffected: service_role / postgres / SECURITY DEFINER RPCs (current_user is
-- not `authenticated`), and admins. Self-edit from the app writes only
-- full_name, first_name, last_name, phone, avatar_url and locale
-- (app/actions/profile-settings.ts, app/api/users/profile/route.ts).
-- Onboarding, account deletion, lockout and the Cal.com intake use the admin
-- client.
--
-- Additive: one function and one trigger. Safe to re-run.
-- ============================================================================

create or replace function public.profiles_guard_self_update()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_self_editable constant text[] := array[
    'full_name', 'first_name', 'last_name', 'phone', 'avatar_url', 'locale', 'updated_at'
  ];
begin
  -- service_role, postgres, the auth admin and SECURITY DEFINER RPCs run as
  -- another role; only the PostgREST user role is restricted here.
  if current_user <> 'authenticated' then
    return new;
  end if;

  -- is_admin() reads the committed row, so a flag cannot be smuggled in by the
  -- same UPDATE that sets it.
  if (select public.is_admin()) then
    return new;
  end if;

  if (to_jsonb(new) - v_self_editable) is distinct from (to_jsonb(old) - v_self_editable) then
    raise exception 'profiles: only an admin can change this field'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.profiles_guard_self_update() from public;

drop trigger if exists trg_profiles_guard_self_update on public.profiles;
create trigger trg_profiles_guard_self_update
  before update on public.profiles
  for each row execute function public.profiles_guard_self_update();
