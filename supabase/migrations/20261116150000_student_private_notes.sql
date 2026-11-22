-- Teacher notes about a student leave the profiles row (#1096).
--
-- profiles.notes is the "Goals / notes" field a teacher fills in about a
-- student. Row-level security cannot hide one column, and three policies hand
-- the whole profiles row to someone who is not staff: the student
-- (profiles_select_own), the student's parent (profiles_select_parent) and,
-- for a teacher's own row, that teacher's students (profiles_select_own_teacher).
-- Any of them could read the notes through the API.
--
-- The notes move to student_private_notes, which only admins and teachers can
-- read. Every existing writer keeps writing profiles.notes (the user forms, the
-- API, the Cal.com intake): a trigger moves the text into the new table and
-- leaves the column empty, so code running before and after this migration
-- both work (expand → contract; dropping the column is a later migration).
-- A blank value clears the note.

create table if not exists public.student_private_notes (
  -- Deferred: the BEFORE INSERT trigger on profiles writes the note before
  -- the profile row itself exists; the check runs at commit.
  profile_id uuid primary key
    references public.profiles(id) on delete cascade
    deferrable initially deferred,
  notes text not null,
  updated_at timestamptz not null default now()
);

comment on table public.student_private_notes is
  'Teacher notes about a profile (was profiles.notes). Staff read only; written through profiles.notes by trg_profiles_move_private_notes.';

alter table public.student_private_notes enable row level security;

drop policy if exists student_private_notes_select_staff on public.student_private_notes;
create policy student_private_notes_select_staff on public.student_private_notes
  for select to authenticated
  using ((select public.is_admin_or_teacher()));

revoke all on public.student_private_notes from anon, authenticated;
grant select on public.student_private_notes to authenticated;
grant all on public.student_private_notes to service_role;

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

drop trigger if exists trg_profiles_move_private_notes on public.profiles;
create trigger trg_profiles_move_private_notes
  before insert or update of notes on public.profiles
  for each row execute function public.profiles_move_private_notes();

-- Existing notes: copy them over, then empty the column. Re-running is safe —
-- the column is already empty and the copy skips rows that exist.
insert into public.student_private_notes (profile_id, notes)
select id, notes from public.profiles
where notes is not null and btrim(notes) <> ''
on conflict (profile_id) do nothing;

update public.profiles set notes = null where notes is not null;
