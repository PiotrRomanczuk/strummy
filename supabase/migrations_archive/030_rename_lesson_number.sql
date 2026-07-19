-- ============================================================================
-- Migration 030: Rename lesson_number to lesson_teacher_number
-- Fix mismatch between database schema and TypeScript types
-- ============================================================================
-- Context: The database has 'lesson_number' but all TypeScript types and
-- application code reference 'lesson_teacher_number'. This migration aligns
-- the database with the application code to fix PostgREST update errors.

-- Rename the column
ALTER TABLE lessons
RENAME COLUMN lesson_number TO lesson_teacher_number;

-- Update the constraint name for consistency
ALTER TABLE lessons
DROP CONSTRAINT IF EXISTS uq_lessons_number;

ALTER TABLE lessons
ADD CONSTRAINT uq_lessons_teacher_number UNIQUE (teacher_id, student_id, lesson_teacher_number);

-- Update the comment
COMMENT ON COLUMN lessons.lesson_teacher_number IS 'Sequential lesson number per teacher-student pair (auto-set by trigger)';
