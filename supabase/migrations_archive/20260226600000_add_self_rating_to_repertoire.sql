-- ============================================================================
-- Migration: Add Student Self-Rating to student_repertoire
-- Allows students to rate their own confidence/comfort level on each song.
-- ============================================================================

-- Add self_rating column (1-5 confidence scale)
ALTER TABLE student_repertoire
  ADD COLUMN self_rating INTEGER CHECK (self_rating IS NULL OR (self_rating >= 1 AND self_rating <= 5));

-- Add timestamp for when student last updated their self-rating
ALTER TABLE student_repertoire
  ADD COLUMN self_rating_updated_at TIMESTAMPTZ;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN student_repertoire.self_rating
  IS 'Student self-assessed confidence: 1=struggling, 2=needs work, 3=okay, 4=comfortable, 5=mastered';

COMMENT ON COLUMN student_repertoire.self_rating_updated_at
  IS 'When the student last updated their self-rating';
