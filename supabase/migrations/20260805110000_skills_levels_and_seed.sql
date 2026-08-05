-- Skill tracking: 4-level status vocabulary + real catalog seed.
-- ============================================================================
-- student_skills.status was 3-valued (todo/in_progress/mastered) — the
-- feature shipped but the catalog was never seeded (1 E2E fixture row on
-- dev), so it's unusable. Two fixes in one migration:
--
-- 1) Align status with the terminology the post-lesson-summary AI agent
--    ALREADY uses in its own prompt (lib/ai/agents/post-lesson-summary.ts:
--    Developing/Progressing/Proficient/Mastered) — AI-suggested assessments
--    and teacher-entered ones now speak the same vocabulary.
-- 2) Seed a real starting catalog so the "Assign New Skill" dropdown on the
--    student detail page isn't empty.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Backfill existing rows, then widen the check constraint.
-- ---------------------------------------------------------------------------
update public.student_skills set status = 'developing' where status = 'todo';
update public.student_skills set status = 'progressing' where status = 'in_progress';
-- 'mastered' is unchanged — it exists in both vocabularies.

alter table public.student_skills
  drop constraint if exists student_skills_status_check;
alter table public.student_skills
  add constraint student_skills_status_check
  check (status = any (array['developing', 'progressing', 'proficient', 'mastered']));

-- ---------------------------------------------------------------------------
-- 2) Idempotent catalog seed. Unique on name so re-running this migration
--    (or a future seed script) is a no-op rather than a duplicate row.
-- ---------------------------------------------------------------------------
alter table public.skills
  drop constraint if exists skills_name_key;
alter table public.skills
  add constraint skills_name_key unique (name);

insert into public.skills (name, category, description) values
  ('Open chords (E, A, D, G, C)', 'Chords', 'Clean, buzz-free open chord shapes'),
  ('Barre chord (F major)', 'Chords', 'First barre chord — key intermediate milestone'),
  ('Barre chord (B minor)', 'Chords', 'Barre shape on the A string'),
  ('Power chords', 'Chords', 'Two/three-note movable power chord shapes'),
  ('Chord transition speed', 'Chords', 'Switching between chords without a pause to reposition'),
  ('Steady strumming pattern', 'Rhythm', 'Consistent down/up strumming, hand keeps moving'),
  ('Syncopated strumming', 'Rhythm', 'Off-beat accents, muted strums'),
  ('Playing with a metronome', 'Rhythm', 'Holding a target tempo without drifting'),
  ('Fingerpicking pattern basics', 'Rhythm', 'Thumb/finger independence on a basic pattern'),
  ('Note names on the fretboard', 'Theory', 'Naming notes on at least the low E and A strings'),
  ('Major scale shapes', 'Theory', 'One movable major scale shape, ascending/descending'),
  ('Basic key signatures', 'Theory', 'Reading sharps/flats for common keys'),
  ('Reading chord charts and tab', 'Theory', 'Following a chart or tab without teacher guidance'),
  ('Palm muting', 'Technique', 'Controlled muting for rhythm parts'),
  ('String bending', 'Technique', 'Pitch-accurate bends'),
  ('Hammer-ons and pull-offs', 'Technique', 'Legato technique on single strings'),
  ('Alternate picking', 'Technique', 'Consistent down-up picking at tempo'),
  ('First full song completion', 'Repertoire', 'Playing a song start to finish at performance tempo')
on conflict (name) do nothing;
