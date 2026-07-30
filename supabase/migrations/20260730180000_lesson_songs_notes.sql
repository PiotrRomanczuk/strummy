-- Restore lesson_songs.notes.
--
-- The per-song lesson notes feature is fully built — Zod schema
-- (lessonSongNotesSchema), server action (saveLessonSongNotes in
-- app/dashboard/lessons/actions.ts), UI (components/songs/SongNotesCard.tsx)
-- and AI note generation — but the column it writes to was not carried into
-- the rebuilt schema. Two live call sites failed with 42703 as a result:
--
--   * app/dashboard/lessons/actions.ts  -> .update({ notes })
--       surfaced to teachers as "Failed to save song notes"
--   * app/api/lessons/[id]/songs/route.ts -> .select(... notes ...)
--       rejected the whole select, so the endpoint 500'd entirely
--
-- Adding the column back (rather than deleting the feature) restores both.
-- No RLS changes needed: lesson_songs already has policies and this only
-- widens an existing table.

alter table public.lesson_songs
  add column if not exists notes text;

comment on column public.lesson_songs.notes is
  'Teacher''s free-text notes for this song within this lesson.';
