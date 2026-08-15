-- Expand the skills catalog seeded in 20260805110000 (18 rows) with a fuller
-- curriculum — 54 more entries across the existing 5 categories plus 5 new
-- ones (Ear Training, Improvisation, Performance, Gear & Setup, Reading).
-- Idempotent via the unique(name) constraint added in 20260805110000.

insert into public.skills (name, category, description) values
  -- Chords
  ('7th chords (dominant, major, minor)', 'Chords', 'Extended chord shapes beyond basic triads'),
  ('Sus2 and sus4 chords', 'Chords', 'Suspended chord shapes and their resolution'),
  ('Add9 and other color chords', 'Chords', 'Adding color tones to basic chord shapes'),
  ('CAGED movable chord shapes', 'Chords', 'Using the CAGED system to find chords anywhere on the neck'),
  ('Chord inversions and slash chords', 'Chords', 'Playing chords with a bass note other than the root'),
  ('Diminished and augmented chords', 'Chords', 'Less common chord qualities and their typical use'),
  ('Open tuning chords (open D/G)', 'Chords', 'Fretting chords in an alternate open tuning'),
  ('Capo usage and transposition', 'Chords', 'Using a capo to change key while keeping familiar shapes'),

  -- Rhythm
  ('Palm-muted rhythm patterns', 'Rhythm', 'Controlled muting within a strumming pattern'),
  ('16th-note strumming subdivisions', 'Rhythm', 'Subdividing the beat into 16th notes while strumming'),
  ('Triplet feel / shuffle rhythm', 'Rhythm', 'Swung, triplet-based rhythmic feel'),
  ('Odd time signatures (6/8, 3/4)', 'Rhythm', 'Playing comfortably outside standard 4/4'),
  ('Locking in with a backing track or drummer', 'Rhythm', 'Staying in the pocket with another rhythmic source'),
  ('Dynamic strumming (soft to loud control)', 'Rhythm', 'Controlling strum volume and intensity intentionally'),
  ('Travis picking pattern', 'Rhythm', 'Alternating-bass fingerstyle pattern'),
  ('Percussive strumming (body taps)', 'Rhythm', 'Incorporating body percussion into a strum pattern'),

  -- Theory
  ('Minor scale shapes (natural minor)', 'Theory', 'One movable natural minor scale shape'),
  ('Pentatonic scale shapes (major/minor)', 'Theory', 'The five-note scale shapes used across genres'),
  ('Circle of fifths', 'Theory', 'Key relationships and how they map around the circle'),
  ('Interval recognition', 'Theory', 'Naming and hearing the distance between two notes'),
  ('Triad construction', 'Theory', 'Building major/minor/diminished/augmented triads from a root'),
  ('Diatonic harmony (I-IV-V and beyond)', 'Theory', 'Chords built from a single major scale'),
  ('Intro to modes (Dorian, Mixolydian, etc.)', 'Theory', 'Recognizing and using modal scale flavors'),
  ('Transposing a song to a new key', 'Theory', 'Moving a song to a different key on paper or by ear'),
  ('Recognizing chord changes by ear', 'Theory', 'Identifying when and to what a progression changes'),

  -- Technique
  ('Vibrato control', 'Technique', 'Controlled pitch oscillation on a held note'),
  ('Slides', 'Technique', 'Sliding between two fretted notes smoothly'),
  ('Tapping basics', 'Technique', 'Two-hand tapping on the fretboard'),
  ('Sweep picking basics', 'Technique', 'Single-motion picking across adjacent strings'),
  ('Two-hand finger independence', 'Technique', 'Fretting and picking hands moving independently and accurately'),
  ('Pinch harmonics', 'Technique', 'Producing harmonic overtones with the picking hand'),
  ('Left-hand muting of unwanted strings', 'Technique', 'Keeping adjacent strings silent while fretting'),
  ('Economy picking', 'Technique', 'Picking technique that minimizes pick-hand motion across strings'),
  ('Tremolo picking', 'Technique', 'Rapid repeated picking on a single note'),
  ('Fingerstyle right-hand posture', 'Technique', 'Thumb/finger positioning for classical or fingerstyle playing'),

  -- Repertoire
  ('Learning a song by ear', 'Repertoire', 'Working out chords/melody from a recording without tab'),
  ('Performing a song from memory', 'Repertoire', 'Playing a full song without notes or lyrics sheet'),
  ('Playing along with a full-band backing track', 'Repertoire', 'Fitting into a mixed-instrument recording'),
  ('Building a 3-song setlist', 'Repertoire', 'Sequencing songs for a short performance'),
  ('Learning a song in a new genre', 'Repertoire', 'Stepping outside the student''s usual style'),

  -- Ear Training
  ('Identifying major vs minor by ear', 'Ear Training', 'Distinguishing chord/key quality without seeing the chart'),
  ('Recognizing common chord progressions by ear', 'Ear Training', 'Spotting familiar progressions (e.g. I-V-vi-IV) by listening'),
  ('Pitch matching while playing', 'Ear Training', 'Singing in tune with what is being played'),

  -- Improvisation
  ('Basic pentatonic soloing over a backing track', 'Improvisation', 'Improvising a solo using one pentatonic shape'),
  ('Call-and-response phrasing', 'Improvisation', 'Trading short musical phrases with a teacher or track'),
  ('Improvising within a single scale position', 'Improvisation', 'Staying musical without shifting positions'),

  -- Performance
  ('Playing without looking at hands', 'Performance', 'Muscle-memory reliance for chord changes and picking'),
  ('Performing in front of an audience or camera', 'Performance', 'Managing nerves while being watched or recorded'),
  ('Stage presence while singing and playing', 'Performance', 'Eye contact, posture, and engagement during performance'),

  -- Gear & Setup
  ('Tuning the guitar (by ear and with a tuner)', 'Gear & Setup', 'Accurate tuning using both methods'),
  ('Changing strings', 'Gear & Setup', 'Removing and installing a full set of strings'),
  ('Basic guitar maintenance', 'Gear & Setup', 'Cleaning, string stretching, and simple upkeep'),

  -- Reading
  ('Reading standard notation basics', 'Reading', 'Identifying notes and rhythms on a musical staff'),
  ('Reading rhythm notation', 'Reading', 'Interpreting note durations without pitch (rhythm-only reading)')
on conflict (name) do nothing;
