-- ============================================================================
-- Migration 031: Fix lesson number trigger after column rename
-- Update the set_lesson_number() trigger to use lesson_teacher_number
-- ============================================================================

CREATE OR REPLACE FUNCTION set_lesson_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Find the next lesson number for this teacher-student pair
    SELECT COALESCE(MAX(lesson_teacher_number), 0) + 1 INTO next_number
    FROM lessons
    WHERE teacher_id = NEW.teacher_id
    AND student_id = NEW.student_id;

    NEW.lesson_teacher_number := next_number;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_lesson_number IS 'Auto-sets sequential lesson_teacher_number per teacher-student pair';
