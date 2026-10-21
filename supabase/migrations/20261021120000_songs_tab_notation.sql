-- 2026-10-21 — songs.tab_notation: tablature (riffs, solos) imported from
-- Ultimate Guitar "tabs" pages. Kept apart from lyrics_with_chords so a song
-- can carry both a chord sheet and a riff tab. Plain text, rendered verbatim
-- in monospace like lyrics_with_chords. Additive and nullable: the running
-- code ignores it until the form and detail page ship.
alter table public.songs add column if not exists tab_notation text;

comment on column public.songs.tab_notation is
  'Guitar tablature (e|--- lines with [Section] headers), shown in the Tabs tab of the song page.';
