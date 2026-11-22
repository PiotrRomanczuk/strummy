-- Only staff write a teacher note through profiles.notes (#1096, review of #1115).
--
-- profiles_move_private_notes is SECURITY DEFINER and copied whatever arrived
-- in profiles.notes into student_private_notes. profiles_update_own lets a
-- student update their own row, so a student could overwrite the teacher's
-- note about them, or clear it with a blank value, without ever being able to
-- read it. trg_profiles_guard_self_update (20261115120000) already refuses
-- that update for a non-admin; this makes the notes trigger safe on its own,
-- so it does not depend on trigger order or on the guard's column list.
--
-- A signed-in user who is neither admin nor teacher: the value is dropped, the
-- stored note stays as it was. Service role, postgres and the auth admin have
-- no auth.uid() and keep writing (user forms, API, Cal.com intake).
--
-- Additive: replaces one function. Safe to re-run.

create or replace function public.profiles_move_private_notes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.notes is null then
    return new;
  end if;

  if (select auth.uid()) is not null and not (select public.is_admin_or_teacher()) then
    new.notes := null;
    return new;
  end if;

  if btrim(new.notes) = '' then
    delete from public.student_private_notes where profile_id = new.id;
  else
    insert into public.student_private_notes (profile_id, notes)
    values (new.id, new.notes)
    on conflict (profile_id) do update
      set notes = excluded.notes, updated_at = now();
  end if;

  new.notes := null;
  return new;
end;
$$;

revoke all on function public.profiles_move_private_notes() from public, anon, authenticated;
