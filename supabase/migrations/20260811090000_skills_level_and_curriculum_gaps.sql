-- Add a beginner/intermediate/advanced `level` dimension to the skills
-- catalog so the student-detail Skills tab can render a per-level checklist
-- (today it's a flat, category-only list). Backfills level for the 72
-- existing rows seeded in 20260805110000 and 20260806090000, and adds a
-- handful of curriculum items that weren't in the catalog yet: barre-chord
-- construction, thumb-over-barre fingerstyle, boom-chick pattern, and
-- reducing a song to its relative-minor/CAGED family.

alter table public.skills add column if not exists level text;

alter table public.skills drop constraint if exists skills_level_check;
alter table public.skills
  add constraint skills_level_check
  check (level is null or level = any (array['beginner', 'intermediate', 'advanced']));

-- ---------------------------------------------------------------------------
-- Backfill: beginner
-- ---------------------------------------------------------------------------
update public.skills set level = 'beginner' where name in (
  'Open chords (E, A, D, G, C)',
  'Power chords',
  'Chord transition speed',
  'Steady strumming pattern',
  'Playing with a metronome',
  'Reading chord charts and tab',
  'Palm muting',
  'First full song completion',
  'Capo usage and transposition',
  'Identifying major vs minor by ear',
  'Pitch matching while playing',
  'Tuning the guitar (by ear and with a tuner)',
  'Changing strings',
  'Basic guitar maintenance'
);

-- ---------------------------------------------------------------------------
-- Backfill: intermediate
-- ---------------------------------------------------------------------------
update public.skills set level = 'intermediate' where name in (
  'Barre chord (F major)',
  'Barre chord (B minor)',
  'Syncopated strumming',
  'Fingerpicking pattern basics',
  'Note names on the fretboard',
  'Major scale shapes',
  'Basic key signatures',
  'String bending',
  'Hammer-ons and pull-offs',
  'Alternate picking',
  '7th chords (dominant, major, minor)',
  'Sus2 and sus4 chords',
  'CAGED movable chord shapes',
  'Palm-muted rhythm patterns',
  '16th-note strumming subdivisions',
  'Triplet feel / shuffle rhythm',
  'Locking in with a backing track or drummer',
  'Dynamic strumming (soft to loud control)',
  'Minor scale shapes (natural minor)',
  'Pentatonic scale shapes (major/minor)',
  'Circle of fifths',
  'Interval recognition',
  'Triad construction',
  'Diatonic harmony (I-IV-V and beyond)',
  'Vibrato control',
  'Slides',
  'Left-hand muting of unwanted strings',
  'Performing a song from memory',
  'Building a 3-song setlist',
  'Recognizing common chord progressions by ear',
  'Basic pentatonic soloing over a backing track',
  'Call-and-response phrasing',
  'Playing without looking at hands',
  'Performing in front of an audience or camera',
  'Reading rhythm notation'
);

-- ---------------------------------------------------------------------------
-- Backfill: advanced
-- ---------------------------------------------------------------------------
update public.skills set level = 'advanced' where name in (
  'Add9 and other color chords',
  'Chord inversions and slash chords',
  'Diminished and augmented chords',
  'Open tuning chords (open D/G)',
  'Odd time signatures (6/8, 3/4)',
  'Travis picking pattern',
  'Percussive strumming (body taps)',
  'Intro to modes (Dorian, Mixolydian, etc.)',
  'Transposing a song to a new key',
  'Recognizing chord changes by ear',
  'Tapping basics',
  'Sweep picking basics',
  'Two-hand finger independence',
  'Pinch harmonics',
  'Economy picking',
  'Tremolo picking',
  'Fingerstyle right-hand posture',
  'Learning a song by ear',
  'Playing along with a full-band backing track',
  'Learning a song in a new genre',
  'Improvising within a single scale position',
  'Stage presence while singing and playing',
  'Reading standard notation basics'
);

-- ---------------------------------------------------------------------------
-- Fill the remaining curriculum gaps, tagged with their level directly.
-- ---------------------------------------------------------------------------
insert into public.skills (name, category, description, level) values
  (
    'Barre chord construction (how movable shapes are built)',
    'Theory',
    'Understanding how a barre chord is an open-chord shape moved up the neck with the index finger as the nut',
    'intermediate'
  ),
  (
    'Reducing a song to its relative minor/CAGED family',
    'Theory',
    'Recognizing how a chord progression maps back to a single CAGED shape or relative minor/major pair',
    'intermediate'
  ),
  (
    'Thumb-over barre chords (fingerstyle technique)',
    'Technique',
    'Fretting the low E string with the thumb wrapped over the neck instead of a full barre',
    'advanced'
  ),
  (
    'Boom-chick bass/strum pattern',
    'Rhythm',
    'Alternating-bass fingerstyle/strum pattern (bass note on the downbeat, chord strum on the upbeat)',
    'advanced'
  )
on conflict (name) do nothing;
