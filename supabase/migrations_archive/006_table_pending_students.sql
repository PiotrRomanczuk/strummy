-- ============================================================================
-- Migration 006: Pending Students Table (Shadow Users)
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Separate table for students created by teachers before they sign up
-- This cleanly separates "shadow" users from real authenticated users
-- When student signs up, data is migrated to profiles and deleted from here

CREATE TABLE pending_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Contact information
    email email_address NOT NULL UNIQUE,
    full_name VARCHAR(255),
    phone VARCHAR(50),

    -- Notes about the student
    notes medium_text,

    -- Who created this pending student
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX ix_pending_students_email ON pending_students(email);
CREATE INDEX ix_pending_students_created_by ON pending_students(created_by);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER tr_pending_students_updated_at
    BEFORE UPDATE ON pending_students
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE pending_students IS 'Students created by teachers before they have a real account';
COMMENT ON COLUMN pending_students.created_by IS 'Teacher who created this pending student record';
COMMENT ON COLUMN pending_students.email IS 'Email that will be used when student signs up';
