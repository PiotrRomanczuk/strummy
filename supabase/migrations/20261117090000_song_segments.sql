-- A song part by part (song2logic `segments`, SNG-16): for every part of the recording its name, where it repeats,
-- the chords of its bars with their degrees and the loop they make, the bass riff, the drum groove and who plays
-- how loud. One row per song; a new analysis replaces it. Only songs of the repertoire are loaded.
--
--   parts      [{n, label, name, repeat_of, first_bar, bars, start_s, end_s, bpm, vocals, chords, roman, loop,
--               bass: {pattern, notes_per_bar, lowest, highest, riff, riff_share} | null,
--               drums: {patterns, kick, snare, cymbal, fills} | null, levels}, …] — what the song page and the
--               statistics read.
--   bass_bars  per part (same order) the bass of every bar, note by note ([[{slot, sixteenths, note, degree}, …],
--              …] or null where the bass rests): kept whole, apart from `parts`, so lists never carry it.
--
-- Not `song_transcriptions` (the raw notes) and not `song_sections` (the teacher's own lesson sections): this is
-- what the machine heard in one recording (`recording_url`, whose bars and seconds these are). Loaded by
-- scripts/backfill/2026-11-song-segments.ts (service role only).

create table if not exists public.song_segments (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  recording_url text not null,
  tool_version text not null,
  analysed_on date,
  song_key text not null,
  bpm numeric not null,
  feel text not null,
  felt_bpm numeric not null,
  beats_per_bar integer not null,
  part_count integer not null,
  parts jsonb not null,
  bass_bars jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint song_segments_song_id_key unique (song_id)
);

drop trigger if exists trg_song_segments_set_updated_at on public.song_segments;
create trigger trg_song_segments_set_updated_at
  before update on public.song_segments
  for each row execute function public.set_updated_at();

-- Grants: staff read; only the service role (the backfill script) writes.
grant select on public.song_segments to authenticated;
grant all on public.song_segments to service_role;

alter table public.song_segments enable row level security;

drop policy if exists song_segments_select_staff on public.song_segments;
create policy song_segments_select_staff on public.song_segments
  for select
  to authenticated
  using (public.is_admin_or_teacher());
