-- Machine transcription of a song's recording (song2logic `study`, SNG-12): every note heard in the stems — vocals,
-- guitar, bass, piano, other and the drum parts — with the bar grid the notes are drawn on. One row per song; a new
-- transcription replaces it. Only songs of the repertoire are loaded (Piotr, 2026-11-15).
--
--   tracks  {"<track>": [[start_s, seconds, midi_pitch, velocity, bar, slot], …]}, kept whole; drum parts carry
--           their General MIDI drum note as the pitch. `bar`/`slot` are song2logic's rough placement; the app draws
--           from seconds through grid.downbeats_s, because real bars drift from a steady tempo.
--   grid    {bpm, beats_per_bar, downbeats_s}
--   stats   per track {notes, low, high, median, per_bar, active_share}, computed by the loader so lists and
--           statistics never read the raw notes.
--
-- Not `song_analysis_sources`: there `study` is the per-track profile; here are the raw notes of one recording
-- (`recording_url`, whose timings they are). Loaded by scripts/backfill/2026-11-song-transcriptions.ts (service
-- role only).

create table if not exists public.song_transcriptions (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  recording_url text not null,
  tool_version text not null,
  transcribed_on date,
  note_count integer not null,
  grid jsonb not null,
  tracks jsonb not null,
  stats jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint song_transcriptions_song_id_key unique (song_id)
);

drop trigger if exists trg_song_transcriptions_set_updated_at on public.song_transcriptions;
create trigger trg_song_transcriptions_set_updated_at
  before update on public.song_transcriptions
  for each row execute function public.set_updated_at();

-- Grants: staff read; only the service role (the backfill script) writes.
grant select on public.song_transcriptions to authenticated;
grant all on public.song_transcriptions to service_role;

alter table public.song_transcriptions enable row level security;

drop policy if exists song_transcriptions_select_staff on public.song_transcriptions;
create policy song_transcriptions_select_staff on public.song_transcriptions
  for select
  to authenticated
  using (public.is_admin_or_teacher());
