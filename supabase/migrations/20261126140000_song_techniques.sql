-- Playing techniques of a song (#1206, part of #1146): per song, how many times each technique occurs and how
-- many notes the song has in all. One row per song; a new count replaces it. Labels only: no notes, no tablature.
--
--   note_count  the song's total note count, the denominator for "how much of the song is this technique".
--   techniques  object, technique key -> count, e.g. {"hammer_pull": 32, "slide": 3}. Keys are the loader's
--               vocabulary (lib/music-theory/song-techniques.ts decides which are shown and how strong).
--   source      where the count comes from; 'tab' = counted from a tablature of the song. A hint, not a
--               transcription.
--
-- Read: every signed-in user who can read the song itself (the sub-select runs under the songs policies, so this
-- table is never wider than `songs`). Write: staff, and the service role (scripts/backfill/2026-11-song-techniques.ts).

create table if not exists public.song_techniques (
  song_id uuid primary key references public.songs (id) on delete cascade,
  note_count integer not null check (note_count > 0),
  techniques jsonb not null check (jsonb_typeof(techniques) = 'object'),
  source text not null default 'tab',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_song_techniques_set_updated_at on public.song_techniques;
create trigger trg_song_techniques_set_updated_at
  before update on public.song_techniques
  for each row execute function public.set_updated_at();

alter table public.song_techniques enable row level security;

revoke all on public.song_techniques from anon;
grant select, insert, update, delete on public.song_techniques to authenticated;
grant all on public.song_techniques to service_role;

drop policy if exists song_techniques_select on public.song_techniques;
create policy song_techniques_select on public.song_techniques
  for select
  to authenticated
  using (exists (select 1 from public.songs s where s.id = song_techniques.song_id));

drop policy if exists song_techniques_insert_staff on public.song_techniques;
create policy song_techniques_insert_staff on public.song_techniques
  for insert
  to authenticated
  with check (public.is_admin_or_teacher());

drop policy if exists song_techniques_update_staff on public.song_techniques;
create policy song_techniques_update_staff on public.song_techniques
  for update
  to authenticated
  using (public.is_admin_or_teacher())
  with check (public.is_admin_or_teacher());

drop policy if exists song_techniques_delete_staff on public.song_techniques;
create policy song_techniques_delete_staff on public.song_techniques
  for delete
  to authenticated
  using (public.is_admin_or_teacher());
