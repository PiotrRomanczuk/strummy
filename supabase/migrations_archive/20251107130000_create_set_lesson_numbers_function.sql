-- Migration: Create set_lesson_numbers function
-- PHASE 3, STEP 11
-- Function: set_lesson_numbers()
-- Purpose: Automatically assign and increment lesson_teacher_number for each teacher-student pair

CREATE OR REPLACE FUNCTION set_lesson_numbers()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Find the next lesson_teacher_number for this teacher-student pair
    SELECT COALESCE(MAX(lesson_teacher_number), 0) + 1 INTO next_number
    FROM lessons
    WHERE teacher_id = NEW.teacher_id AND student_id = NEW.student_id;

    -- Set the lesson_teacher_number for the new lesson
    NEW.lesson_teacher_number := next_number;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
