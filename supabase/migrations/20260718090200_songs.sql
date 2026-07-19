-- Songs (minimal core). docs/DATABASE_REBUILD.md Step 2.
-- Shared library: any authenticated user reads non-deleted rows; admin/teacher write.
-- Rich metadata (tempo, lyrics, media, AI, recording state) is deferred to a later phase.

-- music_key is a closed, stable set — enum is appropriate. Defined here (first use).
do $$ begin
  create type public.music_key as enum (
    'C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B',
    'Cm','C#m','Dm','D#m','Ebm','Em','Fm','F#m','Gm','G#m','Am','A#m','Bbm','Bm'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.songs (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null,
  author               text,
  level                public.difficulty_level,
  key                  public.music_key,
  chords               text,
  short_title          text,
  ultimate_guitar_link text,
  deleted_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Index only what the list view filters/sorts on (no speculative indexing).
create index if not exists ix_songs_title on public.songs (title) where deleted_at is null;

create trigger trg_songs_set_updated_at
  before update on public.songs
  for each row execute function public.set_updated_at();

-- Grants: RLS scopes rows below; grants gate table access.
grant select, insert, update, delete on public.songs to authenticated;
grant all on public.songs to service_role;

alter table public.songs enable row level security;

-- Read: any authenticated user, non-deleted rows (shared library).
drop policy if exists songs_select_active on public.songs;
create policy songs_select_active on public.songs
  for select to authenticated
  using (deleted_at is null or public.is_admin());

-- Write: admin or teacher only.
drop policy if exists songs_insert_staff on public.songs;
create policy songs_insert_staff on public.songs
  for insert to authenticated
  with check (public.is_admin_or_teacher());

drop policy if exists songs_update_staff on public.songs;
create policy songs_update_staff on public.songs
  for update to authenticated
  using (public.is_admin_or_teacher())
  with check (public.is_admin_or_teacher());

drop policy if exists songs_delete_staff on public.songs;
create policy songs_delete_staff on public.songs
  for delete to authenticated
  using (public.is_admin_or_teacher());
