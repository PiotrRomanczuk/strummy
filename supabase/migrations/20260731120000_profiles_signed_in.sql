-- Expose "has this person ever signed in?" to RLS-bound callers.
--
-- The app has been treating `is_shadow` as the definition of "unclaimed", but
-- the two come apart the moment an invite is sent: sending an invite creates the
-- auth.users row and flips is_shadow to false, while the person still has not
-- signed in. Everything keyed on is_shadow therefore treats an invited-but-
-- unclaimed student as fully onboarded -- which is why the "Invite to claim"
-- button disappears after the first invite and an expired invite becomes a dead
-- end with no way to resend.
--
-- The real signal is auth.users.last_sign_in_at, which anon/authenticated roles
-- cannot read. (profiles.last_sign_in_at / sign_in_count were dropped by the
-- July 2026 identity rebuild and are deliberately NOT being re-added -- they
-- were denormalised copies that went stale.) This SECURITY DEFINER function
-- answers the question for a caller-supplied set of profile ids without
-- exposing the auth schema.
--
-- Returns only ids that HAVE signed in, so the caller treats "absent" as
-- unclaimed. Restricted to admins and teachers: a student has no business
-- enumerating the sign-in state of other accounts.

create or replace function public.profiles_signed_in(p_profile_ids uuid[])
returns table (profile_id uuid)
language sql
stable
security definer
set search_path = public, auth
as $$
  select p.id
    from public.profiles p
    join auth.users u on u.id = p.user_id
   where p.id = any(p_profile_ids)
     and u.last_sign_in_at is not null
     and (public.is_admin() or public.is_teacher());
$$;

comment on function public.profiles_signed_in(uuid[]) is
  'Given profile ids, returns those whose linked auth user has signed in at '
  'least once. Admin/teacher only. Used to distinguish an invited-but-unclaimed '
  'profile from a claimed one, which is_shadow cannot express.';

revoke all on function public.profiles_signed_in(uuid[]) from public;
grant execute on function public.profiles_signed_in(uuid[]) to authenticated;
