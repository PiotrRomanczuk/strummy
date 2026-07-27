-- Migration: handle_new_user claims shadow profiles in place (S2)
-- ============================================================================
-- Date: 2026-07-27. Fixes docs/analysis/2026-07-27-migrations-architecture-review.md
-- finding 4; implements the "clean single transfer path (S2)" named in
-- docs/DATABASE_REBUILD.md Phase 2.
--
-- Problem: the rebuild's handle_new_user (20260718090100) is a plain INSERT —
-- a shadow student (profiles row with user_id IS NULL) who signs up gets a
-- fresh empty profile, orphaning every lesson/assignment/repertoire row FK'd
-- to their shadow profile id. Meanwhile the live stacks still run an
-- out-of-band LEGACY handle_new_user (text exists nowhere in the repo) that
-- matches by invite_email/email but then INSERTs a NEW profile with
-- id = new.id and calls transfer_shadow_profile_references() to re-point
-- every FK — fragile, and it welds profiles.id to auth.users.id.
--
-- This migration REPLACES BOTH versions with S2: on signup, CLAIM the
-- existing shadow profile in place — set user_id, clear shadow markers —
-- keeping its profile id stable so every FK survives untouched. No reference
-- transfer needed. After this migration, brand-new signups (no shadow to
-- claim) mint an INDEPENDENT profile id (gen_random_uuid, id <> user_id),
-- which is safe because migration 20260727100000 fixed all RLS/RPC
-- comparisons to profile-id space (current_profile_id(), findings 1/2).
--
-- Also heals column drift: profiles.invite_email / profiles.is_shadow exist
-- on the live stacks (baseline-era) and are actively read/written by app code
-- (app/api/users/route.ts, app/api/users/[id]/route.ts), but no active
-- migration created them — a fresh chain replay would break. Idempotent
-- throughout (add column if not exists / create or replace / drop if exists).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Heal drift: shadow columns + invite_email lookup index (mirrors live)
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists invite_email text;
alter table public.profiles add column if not exists is_shadow boolean not null default false;

comment on column public.profiles.invite_email is
  'Real email address for a shadow profile; matched at signup to claim the profile';
comment on column public.profiles.is_shadow is
  'True for teacher-created placeholder profiles with no auth account yet (user_id is null); cleared when claimed at signup';

create index if not exists ix_profiles_invite_email
  on public.profiles (invite_email) where invite_email is not null;

-- ----------------------------------------------------------------------------
-- 2. handle_new_user: claim-in-place (S2), fresh insert only as fallback
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_first text := nullif(new.raw_user_meta_data ->> 'first_name', '');
  v_last  text := nullif(new.raw_user_meta_data ->> 'last_name', '');
  v_full  text := coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''),
                           nullif(trim(concat_ws(' ',
                             nullif(new.raw_user_meta_data ->> 'first_name', ''),
                             nullif(new.raw_user_meta_data ->> 'last_name', ''))), ''));
begin
  -- (a) Claim the shadow profile invited under this email: link auth, swap the
  --     placeholder email for the real one, clear shadow markers. The profile
  --     id stays stable, so every FK (lessons, assignments, repertoire)
  --     survives untouched. Names: fill only where null — never clobber
  --     teacher-entered values. Newest shadow wins if several match.
  update public.profiles p
     set user_id      = new.id,
         email        = new.email,
         is_shadow    = false,
         invite_email = null,
         first_name   = coalesce(p.first_name, v_first),
         last_name    = coalesce(p.last_name, v_last),
         full_name    = coalesce(p.full_name, v_full)
   where p.id = (select s.id from public.profiles s
                  where s.invite_email = new.email
                    and s.is_shadow and s.user_id is null
                  order by s.created_at desc limit 1);
  if found then return new; end if;

  -- (b) Claim an unlinked profile that already carries this email directly
  --     (teacher-created row holding the real address). Same claim, minus the
  --     email assignment (it already matches; citext ignores case).
  update public.profiles p
     set user_id      = new.id,
         is_shadow    = false,
         invite_email = null,
         first_name   = coalesce(p.first_name, v_first),
         last_name    = coalesce(p.last_name, v_last),
         full_name    = coalesce(p.full_name, v_full)
   where p.email = new.email and p.user_id is null;
  if found then return new; end if;

  -- (c) Nothing to claim: mint a fresh profile (id defaults to
  --     gen_random_uuid — independent of new.id by design).
  begin
    insert into public.profiles (user_id, email, first_name, last_name, full_name)
    values (new.id, new.email, v_first, v_last, v_full)
    on conflict (user_id) do nothing;
  exception when unique_violation then
    -- Race: a claimable row with this email appeared between (b) and the
    -- insert. Retry the direct-email claim once; if still nothing, re-raise.
    update public.profiles p
       set user_id      = new.id,
           is_shadow    = false,
           invite_email = null,
           first_name   = coalesce(p.first_name, v_first),
           last_name    = coalesce(p.last_name, v_last),
           full_name    = coalesce(p.full_name, v_full)
     where p.email = new.email and p.user_id is null;
    if not found then raise; end if;
  end;
  return new;
end;
$$;

drop trigger if exists trigger_handle_new_user on auth.users;
create trigger trigger_handle_new_user
  after insert on auth.users
  for each row execute function public.handle_new_user();
