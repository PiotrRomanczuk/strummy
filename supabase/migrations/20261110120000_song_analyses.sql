-- Machine analysis of a song's recording (song2logic `analyze`): tempo, metre, key, chords, tuning, and the full
-- analysis document. One row per song; a re-analysis replaces it.
--
-- Kept apart from `songs` on purpose: the teacher's own values stay the truth. The backfill
-- (scripts/backfill/2026-11-song-analyses.ts) copies a value into `songs` only where the column is empty and
-- records which columns it filled in `filled_fields`, so machine-written values can be told apart and undone.

create table if not exists public.song_analyses (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  tool text not null,
  source_url text,
  source_title text,
  source_duration_ms integer,
  -- The analysed recording is as long as songs.duration_ms (Spotify); null when the song has no duration.
  duration_matches boolean,
  bpm numeric(6, 2),
  beats_per_bar integer,
  key public.music_key,
  key_strength numeric(3, 2),
  -- How the detected key relates to songs.key at analysis time; null when the song has no key.
  key_agreement text,
  tuning_cents integer,
  chords text[] not null default '{}',
  analysis jsonb not null,
  filled_fields text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint song_analyses_song_id_key unique (song_id),
  constraint song_analyses_key_agreement_check check (
    key_agreement is null or key_agreement = any (array['same', 'relative', 'different'])
  )
);

drop trigger if exists trg_song_analyses_set_updated_at on public.song_analyses;
create trigger trg_song_analyses_set_updated_at
  before update on public.song_analyses
  for each row execute function public.set_updated_at();

-- Grants: staff read; only the service role (the backfill script) writes.
grant select on public.song_analyses to authenticated;
grant all on public.song_analyses to service_role;

alter table public.song_analyses enable row level security;

drop policy if exists song_analyses_select_staff on public.song_analyses;
create policy song_analyses_select_staff on public.song_analyses
  for select
  to authenticated
  using (public.is_admin_or_teacher());
