-- ============================================================================
-- Migration 011: Assignment Templates Table
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Reusable assignment templates for teachers

CREATE TABLE assignment_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template content
    title VARCHAR(500) NOT NULL,
    description medium_text,

    -- Owner
    teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX ix_assignment_templates_teacher ON assignment_templates(teacher_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER tr_assignment_templates_updated_at
    BEFORE UPDATE ON assignment_templates
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE assignment_templates IS 'Reusable assignment templates owned by teachers';
COMMENT ON COLUMN assignment_templates.teacher_id IS 'Teacher who owns this template';
