-- Naming clarity only, no schema change. `skills` vs `student_skills` reads
-- ambiguous — the second sounds like "skills a student has", not "this
-- student's assessment record per skill". Not renaming (too much blast
-- radius for a naming nit — types, actions, component, e2e spec, AI context
-- fetcher, agent specs all reference the current names); documenting instead.

comment on table public.skills is
  'Catalog of trackable guitar skills (name, category). Reference data only — '
  'no student reference. One row per possible skill, e.g. "Barre chord (F major)".';

comment on table public.student_skills is
  'Per-student assessment record: one row per (student, skill) pair holding '
  'that student''s current status (developing/progressing/proficient/mastered). '
  'Despite the name, this is an assessment table, not a membership list.';
