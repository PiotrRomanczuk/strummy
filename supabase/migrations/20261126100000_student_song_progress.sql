-- Student progress per song part (#1136): status and tempo, as an append-only history.
--
-- lesson_songs.status is one value per lesson and never changes, so Strummy does not know what a student can
-- play. Each mark here says: this student plays this part of this song at this percent of the original tempo
-- (with the recording). The latest row per part wins; the song's status is derived in code
-- (lib/repertoire/song-part-progress.ts), never stored.
--
-- part_label is the form letter from song_segments.parts[].label ("A", "B"); repeats of a part share it.
-- NULL = the whole song, for songs without song_segments.
--
-- History is immutable: no UPDATE policy. The profile that marked a row (or an admin) may delete it to undo a
-- mis-tap. The table of this name dropped in 20260719000002 was a different, per-song design.
--
-- Additive: one new table, its index and policies.

create table if not exists public.student_song_progress (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.profiles (id) on delete cascade,
  song_id       uuid not null references public.songs (id) on delete cascade,
  part_label    text,
  tempo_percent smallint not null,
  lesson_id     uuid references public.lessons (id) on delete set null,
  marked_by     uuid default public.current_profile_id() references public.profiles (id) on delete set null,
  marked_at     timestamptz not null default now(),
  constraint student_song_progress_part_label_len
    check (part_label is null or char_length(part_label) between 1 and 16),
  constraint student_song_progress_tempo_range
    check (tempo_percent between 1 and 200)
);

comment on table public.student_song_progress is
  'Append-only history of what a student plays, per song part: tempo_percent of the original tempo with the recording. part_label NULL = whole song. Latest row per part wins; status is derived in code.';

create index if not exists ix_student_song_progress_student_song
  on public.student_song_progress (student_id, song_id, marked_at desc);

alter table public.student_song_progress enable row level security;

drop policy if exists student_song_progress_select on public.student_song_progress;
create policy student_song_progress_select on public.student_song_progress
  for select to authenticated
  using (
    (select public.is_admin())
    or student_id = (select public.current_profile_id())
    or (select public.is_child_of_parent(student_id))
    or exists (
      select 1 from public.lessons l
      where l.student_id = student_song_progress.student_id
        and l.teacher_id = (select public.current_profile_id())
        and l.deleted_at is null
    )
  );

drop policy if exists student_song_progress_insert on public.student_song_progress;
create policy student_song_progress_insert on public.student_song_progress
  for insert to authenticated
  with check (
    marked_by = (select public.current_profile_id())
    and (
      (select public.is_admin())
      or (
        (select public.is_teacher())
        and public.may_teach_student(student_id)
      )
    )
  );

drop policy if exists student_song_progress_delete on public.student_song_progress;
create policy student_song_progress_delete on public.student_song_progress
  for delete to authenticated
  using ((select public.is_admin()) or marked_by = (select public.current_profile_id()));

revoke all on public.student_song_progress from anon, authenticated;
grant select, insert, delete on public.student_song_progress to authenticated;
grant all on public.student_song_progress to service_role;
