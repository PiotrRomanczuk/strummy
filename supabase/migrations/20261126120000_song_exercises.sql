-- Song exercises (#1146, first slice): one part of a song saved by the teacher as a named, reusable exercise
-- ("riff from Come Together"). The interesting riff or part of a song is an exercise in itself, even for a student
-- who does not learn the whole song. An exercise is the song card's practice link plus a name:
--
--   song_id          the song the exercise comes from
--   recording_url    the analysed recording the part number belongs to (the card ignores parts of another recording)
--   part_n           the part's number in the analysis (song2logic), as in the card's `?part=` address
--   name, kind       what the teacher calls it; riff | chords | strum | other
--   tempo_percent    the tempo the card was set to, 40–100
--   source           what the card played: the recording or the backing track
--   note             optional hint for whoever practises it
--
-- Staff only (RLS): read, add, change and delete. Students have no access in this slice — assigning an exercise
-- to a student comes later. Additive: a new table, nothing existing is touched.

create table if not exists public.song_exercises (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  recording_url text not null,
  part_n integer not null,
  name text not null,
  kind text not null,
  tempo_percent integer not null default 100,
  source text not null default 'recording',
  note text,
  created_by uuid references public.profiles (id) on delete set null default public.current_profile_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint song_exercises_part_n_positive check (part_n >= 1),
  constraint song_exercises_name_length check (char_length(name) between 1 and 80),
  constraint song_exercises_kind_known check (kind in ('riff', 'chords', 'strum', 'other')),
  constraint song_exercises_tempo_range check (tempo_percent between 40 and 100),
  constraint song_exercises_source_known check (source in ('recording', 'backing')),
  constraint song_exercises_note_length check (note is null or char_length(note) <= 500),
  constraint song_exercises_song_part_name_unique unique (song_id, part_n, name)
);

create index if not exists idx_song_exercises_created_at on public.song_exercises (created_at desc);

drop trigger if exists trg_song_exercises_set_updated_at on public.song_exercises;
create trigger trg_song_exercises_set_updated_at
  before update on public.song_exercises
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.song_exercises to authenticated;
-- Default privileges would hand the table to anon; RLS returns it nothing, but it has no business here at all.
revoke all on public.song_exercises from anon;
grant all on public.song_exercises to service_role;

alter table public.song_exercises enable row level security;

drop policy if exists song_exercises_select_staff on public.song_exercises;
create policy song_exercises_select_staff on public.song_exercises
  for select
  to authenticated
  using (public.is_admin_or_teacher());

drop policy if exists song_exercises_insert_staff on public.song_exercises;
create policy song_exercises_insert_staff on public.song_exercises
  for insert
  to authenticated
  with check (public.is_admin_or_teacher());

drop policy if exists song_exercises_update_staff on public.song_exercises;
create policy song_exercises_update_staff on public.song_exercises
  for update
  to authenticated
  using (public.is_admin_or_teacher())
  with check (public.is_admin_or_teacher());

drop policy if exists song_exercises_delete_staff on public.song_exercises;
create policy song_exercises_delete_staff on public.song_exercises
  for delete
  to authenticated
  using (public.is_admin_or_teacher());
