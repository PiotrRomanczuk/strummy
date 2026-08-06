-- Adds a fourth song difficulty below 'beginner', for material aimed at a
-- student's first weeks (one- and two-chord songs, no barre, slow strums).
-- 'beginner' had been carrying that load alongside genuinely beginner-level
-- repertoire, which made the level useless as a filter at the shallow end.
--
-- Placed BEFORE 'beginner' so the enum's own sort order stays lowest-to-highest
-- and `ORDER BY level` keeps working without a CASE expression.
--
-- Songs only. Theory courses use the separate `theoretical_course_level` enum
-- and are deliberately left at three values.
--
-- NOTE: `ADD VALUE` is permitted inside a transaction on PG12+ as long as the
-- new label is not *used* in the same transaction — it is not here. IF NOT
-- EXISTS makes the statement safe to re-apply.

ALTER TYPE public.difficulty_level ADD VALUE IF NOT EXISTS 'starter' BEFORE 'beginner';

COMMENT ON TYPE public.difficulty_level IS
  'Song difficulty, ordered lowest to highest: starter < beginner < intermediate < advanced.
   starter is first-weeks material; theory courses use theoretical_course_level instead.';
