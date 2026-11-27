-- Song-analysis sources (SNG-7): what each machine source said about a song's recording, kept whole.
--
--   chord-id       Logic Pro's Chord ID on the recording: chord changes in seconds (song2logic `chord-id`)
--   chord-compare  the review of songs.chords against the recording (song2logic `chord-review`)
--   study          per-track profile from the stems (song2logic `study`; not loaded yet)
--
-- One row per song and source; a new run replaces it. Fields are derived from `payload`, never the other way
-- (shape of a review: schemas/SongChordReviewSchema.ts). Kept apart from `song_analyses` because a source may
-- exist without an `analyze` run. Loaded by scripts/backfill/2026-11-song-analysis-sources.ts (service role only).

create table if not exists public.song_analysis_sources (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  source text not null,
  tool_version text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint song_analysis_sources_song_source_key unique (song_id, source),
  constraint song_analysis_sources_source_check check (
    source = any (array['chord-id', 'chord-compare', 'study'])
  )
);

drop trigger if exists trg_song_analysis_sources_set_updated_at on public.song_analysis_sources;
create trigger trg_song_analysis_sources_set_updated_at
  before update on public.song_analysis_sources
  for each row execute function public.set_updated_at();

-- Grants: staff read; only the service role (the backfill script) writes.
grant select on public.song_analysis_sources to authenticated;
grant all on public.song_analysis_sources to service_role;

alter table public.song_analysis_sources enable row level security;

drop policy if exists song_analysis_sources_select_staff on public.song_analysis_sources;
create policy song_analysis_sources_select_staff on public.song_analysis_sources
  for select
  to authenticated
  using (public.is_admin_or_teacher());
