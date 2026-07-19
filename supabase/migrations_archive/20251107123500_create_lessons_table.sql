-- Migration: Create lessons table
-- PHASE 2, STEP 6

CREATE TABLE lessons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_teacher_number integer NOT NULL,
    scheduled_at timestamptz NOT NULL,
    status lesson_status NOT NULL DEFAULT 'SCHEDULED',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT lessons_teacher_student_number_unique UNIQUE (teacher_id, student_id, lesson_teacher_number)
);

-- Indexes for quick lookup
CREATE INDEX lessons_teacher_id_idx ON lessons(teacher_id);
CREATE INDEX lessons_student_id_idx ON lessons(student_id);
