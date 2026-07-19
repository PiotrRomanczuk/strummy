-- ============================================================================
-- Migration 008: Lessons Table
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Guitar lessons between teachers and students

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Participants (both reference profiles.id which = auth.uid())
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Lesson details
    lesson_number INTEGER NOT NULL,  -- Auto-set by trigger per teacher-student pair
    title VARCHAR(255),
    scheduled_at TIMESTAMPTZ NOT NULL,
    status lesson_status NOT NULL DEFAULT 'SCHEDULED',
    notes medium_text,

    -- Google Calendar integration
    google_event_id VARCHAR(255) UNIQUE,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Constraints
    CONSTRAINT ck_lessons_teacher_not_student CHECK (teacher_id != student_id),
    CONSTRAINT uq_lessons_number UNIQUE (teacher_id, student_id, lesson_number)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Teacher's lessons (with common filters)
CREATE INDEX ix_lessons_teacher_scheduled ON lessons(teacher_id, scheduled_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_lessons_teacher_status ON lessons(teacher_id, status, scheduled_at DESC)
    WHERE deleted_at IS NULL;

-- Student's lessons (with common filters)
CREATE INDEX ix_lessons_student_scheduled ON lessons(student_id, scheduled_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_lessons_student_status ON lessons(student_id, status, scheduled_at DESC)
    WHERE deleted_at IS NULL;

-- Google Calendar sync
CREATE INDEX ix_lessons_google_event ON lessons(google_event_id) WHERE google_event_id IS NOT NULL;

-- Soft delete
CREATE INDEX ix_lessons_deleted_at ON lessons(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER tr_lessons_updated_at
    BEFORE UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE lessons IS 'Guitar lessons between teachers and students';
COMMENT ON COLUMN lessons.lesson_number IS 'Sequential number for this teacher-student pair (auto-set)';
COMMENT ON COLUMN lessons.google_event_id IS 'Google Calendar event ID for sync';
COMMENT ON COLUMN lessons.deleted_at IS 'Soft delete timestamp (null = active)';
