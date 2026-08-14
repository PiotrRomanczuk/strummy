-- Adds a `lesson_group` ordering dimension to the skills catalog so the
-- student-detail Skills tab can render skills grouped into a weekly lesson
-- roadmap instead of a flat per-level list: beginner is 11 lessons (~3
-- months weekly), intermediate is 16 lessons (~6 months, roughly every
-- 1.5 weeks). Advanced skills are left ungrouped (lesson_group stays null)
-- — no roadmap has been designed for that tier yet; the UI renders
-- ungrouped skills in a single unheaded bucket, identical to today's flat
-- list, so this is purely additive.

alter table public.skills add column if not exists lesson_group integer;

alter table public.skills drop constraint if exists skills_lesson_group_check;
alter table public.skills
  add constraint skills_lesson_group_check
  check (lesson_group is null or lesson_group > 0);

-- ---------------------------------------------------------------------------
-- Beginner roadmap — 11 lessons
-- ---------------------------------------------------------------------------
update public.skills set lesson_group = 1 where level = 'beginner' and name in (
  'Tuning the guitar (by ear and with a tuner)',
  'Basic guitar maintenance',
  'Changing strings'
);
update public.skills set lesson_group = 2 where level = 'beginner' and name in (
  'Open chords (E, A, D, G, C)'
);
update public.skills set lesson_group = 3 where level = 'beginner' and name in (
  'Reading chord charts and tab',
  'Chord transition speed'
);
update public.skills set lesson_group = 4 where level = 'beginner' and name in (
  'Steady strumming pattern',
  'Playing with a metronome'
);
update public.skills set lesson_group = 5 where level = 'beginner' and name in (
  'Palm muting',
  'Power chords'
);
update public.skills set lesson_group = 6 where level = 'beginner' and name in (
  'Barre chord (F major)'
);
update public.skills set lesson_group = 7 where level = 'beginner' and name in (
  'Identifying major vs minor by ear',
  'Pitch matching while playing'
);
update public.skills set lesson_group = 8 where level = 'beginner' and name in (
  'Capo usage and transposition',
  'CAGED movable chord shapes'
);
update public.skills set lesson_group = 9 where level = 'beginner' and name in (
  'Alternate picking',
  'Slides'
);
update public.skills set lesson_group = 10 where level = 'beginner' and name in (
  'First full song completion'
);
update public.skills set lesson_group = 11 where level = 'beginner' and name in (
  -- milestone lesson: recap + first performance checkpoint
  'Performing a song from memory'
);

-- ---------------------------------------------------------------------------
-- Intermediate roadmap — 16 lessons
-- ---------------------------------------------------------------------------
update public.skills set lesson_group = 1 where level = 'intermediate' and name in (
  'Barre chord (B minor)',
  '7th chords (dominant, major, minor)'
);
update public.skills set lesson_group = 2 where level = 'intermediate' and name in (
  'Sus2 and sus4 chords',
  'Barre chord construction (how movable shapes are built)'
);
update public.skills set lesson_group = 3 where level = 'intermediate' and name in (
  'String bending',
  'Hammer-ons and pull-offs'
);
update public.skills set lesson_group = 4 where level = 'intermediate' and name in (
  'Syncopated strumming',
  'Palm-muted rhythm patterns'
);
update public.skills set lesson_group = 5 where level = 'intermediate' and name in (
  '16th-note strumming subdivisions',
  'Triplet feel / shuffle rhythm'
);
update public.skills set lesson_group = 6 where level = 'intermediate' and name in (
  'Fingerpicking pattern basics',
  'Dynamic strumming (soft to loud control)'
);
update public.skills set lesson_group = 7 where level = 'intermediate' and name in (
  'Locking in with a backing track or drummer',
  'Left-hand muting of unwanted strings'
);
update public.skills set lesson_group = 8 where level = 'intermediate' and name in (
  'Note names on the fretboard',
  'Major scale shapes'
);
update public.skills set lesson_group = 9 where level = 'intermediate' and name in (
  'Basic key signatures',
  'Circle of fifths'
);
update public.skills set lesson_group = 10 where level = 'intermediate' and name in (
  'Minor scale shapes (natural minor)',
  'Pentatonic scale shapes (major/minor)'
);
update public.skills set lesson_group = 11 where level = 'intermediate' and name in (
  'Interval recognition',
  'Triad construction'
);
update public.skills set lesson_group = 12 where level = 'intermediate' and name in (
  'Diatonic harmony (I-IV-V and beyond)',
  'Reducing a song to its relative minor/CAGED family'
);
update public.skills set lesson_group = 13 where level = 'intermediate' and name in (
  'Vibrato control',
  'Reading rhythm notation'
);
update public.skills set lesson_group = 14 where level = 'intermediate' and name in (
  'Building a 3-song setlist',
  'Recognizing common chord progressions by ear'
);
update public.skills set lesson_group = 15 where level = 'intermediate' and name in (
  'Basic pentatonic soloing over a backing track',
  'Call-and-response phrasing'
);
update public.skills set lesson_group = 16 where level = 'intermediate' and name in (
  -- milestone lesson: performance checkpoint
  'Playing without looking at hands',
  'Performing in front of an audience or camera'
);
