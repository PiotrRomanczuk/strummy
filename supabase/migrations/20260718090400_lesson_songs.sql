-- lesson_songs join (minimal core). docs/DATABASE_REBUILD.md Step 4.
-- Songs attached to a lesson, with per-attachment status. Visibility/manage inherit
-- the parent lesson via the can_access_lesson / can_manage_lesson helpers.

create table if not exists public.lesson_songs (
  id         uuid primary key default gen_random_uuid(),
  lesson_id  uuid not null references public.lessons (id) on delete cascade,
  song_id    uuid not null references public.songs (id) on delete cascade,
  status     public.lesson_song_status not null default 'to_learn',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, song_id)
);

create index if not exists ix_lesson_songs_lesson on public.lesson_songs (lesson_id);
create index if not exists ix_lesson_songs_song on public.lesson_songs (song_id);

create trigger trg_lesson_songs_set_updated_at
  before update on public.lesson_songs
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.lesson_songs to authenticated;
grant all on public.lesson_songs to service_role;

alter table public.lesson_songs enable row level security;

drop policy if exists lesson_songs_select on public.lesson_songs;
create policy lesson_songs_select on public.lesson_songs
  for select to authenticated
  using (public.can_access_lesson(lesson_id));

drop policy if exists lesson_songs_insert on public.lesson_songs;
create policy lesson_songs_insert on public.lesson_songs
  for insert to authenticated
  with check (public.can_manage_lesson(lesson_id));

drop policy if exists lesson_songs_update on public.lesson_songs;
create policy lesson_songs_update on public.lesson_songs
  for update to authenticated
  using (public.can_manage_lesson(lesson_id))
  with check (public.can_manage_lesson(lesson_id));

drop policy if exists lesson_songs_delete on public.lesson_songs;
create policy lesson_songs_delete on public.lesson_songs
  for delete to authenticated
  using (public.can_manage_lesson(lesson_id));
