-- ============================================================================
-- Migration 010: Assignments Table
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Teacher-assigned work/practice for students

CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Assignment details
    title VARCHAR(500) NOT NULL,
    description medium_text,
    status assignment_status NOT NULL DEFAULT 'not_started',
    due_date TIMESTAMPTZ,

    -- Relationships
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT ck_assignments_teacher_not_student CHECK (teacher_id != student_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Teacher's assignments (dashboard queries)
CREATE INDEX ix_assignments_teacher_status ON assignments(teacher_id, status, due_date)
    WHERE deleted_at IS NULL;

-- Student's assignments (dashboard queries)
CREATE INDEX ix_assignments_student_status ON assignments(student_id, status, due_date)
    WHERE deleted_at IS NULL;

-- Overdue detection
CREATE INDEX ix_assignments_due_date ON assignments(due_date)
    WHERE deleted_at IS NULL AND status NOT IN ('completed', 'cancelled');

-- Related lesson
CREATE INDEX ix_assignments_lesson ON assignments(lesson_id) WHERE lesson_id IS NOT NULL;

-- Soft delete
CREATE INDEX ix_assignments_deleted_at ON assignments(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER tr_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE assignments IS 'Teacher-assigned work/practice for students';
COMMENT ON COLUMN assignments.lesson_id IS 'Optional link to lesson this assignment came from';
COMMENT ON COLUMN assignments.deleted_at IS 'Soft delete timestamp (null = active)';
