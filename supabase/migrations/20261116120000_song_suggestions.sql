-- Song suggestions (SNG-15): values an AI model proposes for a song's empty or non-standard field — genre, level,
-- artist — waiting for an admin to accept or reject them in the repertoire statistics' data-quality view. Nothing
-- reaches `songs` until an admin accepts; a value whose field was filled meanwhile turns `stale`.
--
-- Written by the admin page (the admin's own session) and by scripts/backfill/2026-11-song-suggestions.ts (service
-- role, e.g. a nightly run with the local model). Only admins read or decide.

create table if not exists public.song_suggestions (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs (id) on delete cascade,
  field text not null,
  value text not null,
  confidence real not null,
  reason text,
  -- Who proposed it: "claude:<model>" or "local:<model>".
  source text not null,
  status text not null default 'pending',
  decided_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint song_suggestions_field_check check (field in ('category', 'level', 'author')),
  constraint song_suggestions_status_check
    check (status in ('pending', 'accepted', 'rejected', 'stale')),
  constraint song_suggestions_confidence_check check (confidence >= 0 and confidence <= 1)
);

-- One open proposal per song and field: a new run replaces it, the decided ones stay as history.
create unique index if not exists song_suggestions_one_pending
  on public.song_suggestions (song_id, field)
  where status = 'pending';

create index if not exists song_suggestions_song_id_idx on public.song_suggestions (song_id);

grant select, insert, update, delete on public.song_suggestions to authenticated;
grant all on public.song_suggestions to service_role;

alter table public.song_suggestions enable row level security;

drop policy if exists song_suggestions_admin on public.song_suggestions;
create policy song_suggestions_admin on public.song_suggestions
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
