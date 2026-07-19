-- ============================================================================
-- Migration: Theoretical Lessons (Courses, Chapters, Access Control)
-- Guitar CRM - Structured theory content with per-user access
-- ============================================================================

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE theoretical_course_level AS ENUM ('beginner', 'intermediate', 'advanced');

COMMENT ON TYPE theoretical_course_level IS 'Difficulty level for theoretical courses';

-- ============================================================================
-- TABLE: theoretical_courses (the "book")
-- ============================================================================

CREATE TABLE theoretical_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content
    title VARCHAR(255) NOT NULL,
    description medium_text,
    cover_image_url url,

    -- Classification
    level theoretical_course_level NOT NULL DEFAULT 'beginner',

    -- Ownership
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Publishing
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ,

    -- Ordering
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: theoretical_lessons (the "chapters")
-- ============================================================================

CREATE TABLE theoretical_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent course
    course_id UUID NOT NULL REFERENCES theoretical_courses(id) ON DELETE CASCADE,

    -- Content
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    excerpt short_text,

    -- Publishing
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ,

    -- Ordering within course
    sort_order INTEGER NOT NULL DEFAULT 0,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique ordering per course
    CONSTRAINT uq_theoretical_lesson_order UNIQUE (course_id, sort_order)
        DEFERRABLE INITIALLY DEFERRED
);

-- ============================================================================
-- TABLE: theoretical_course_access (the "library card")
-- ============================================================================

CREATE TABLE theoretical_course_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Which course
    course_id UUID NOT NULL REFERENCES theoretical_courses(id) ON DELETE CASCADE,

    -- Which user gets access
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Who granted access
    granted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Timestamps
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One access record per user per course
    CONSTRAINT uq_course_access UNIQUE (course_id, user_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Courses: list by creator, filter active
CREATE INDEX ix_theoretical_courses_created_by ON theoretical_courses(created_by)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_theoretical_courses_published ON theoretical_courses(is_published, sort_order)
    WHERE deleted_at IS NULL;

-- Lessons: list by course, ordered
CREATE INDEX ix_theoretical_lessons_course ON theoretical_lessons(course_id, sort_order)
    WHERE deleted_at IS NULL;

CREATE INDEX ix_theoretical_lessons_published ON theoretical_lessons(course_id, is_published, sort_order)
    WHERE deleted_at IS NULL;

-- Access: lookup by user and course
CREATE INDEX ix_theoretical_course_access_user ON theoretical_course_access(user_id);
CREATE INDEX ix_theoretical_course_access_course ON theoretical_course_access(course_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER tr_theoretical_courses_updated_at
    BEFORE UPDATE ON theoretical_courses
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER tr_theoretical_lessons_updated_at
    BEFORE UPDATE ON theoretical_lessons
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE theoretical_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE theoretical_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE theoretical_course_access ENABLE ROW LEVEL SECURITY;

-- ---- theoretical_courses ----

-- Admins see all non-deleted courses
CREATE POLICY tc_select_admin ON theoretical_courses
    FOR SELECT USING (deleted_at IS NULL AND is_admin());

-- Teachers see all non-deleted courses
CREATE POLICY tc_select_teacher ON theoretical_courses
    FOR SELECT USING (deleted_at IS NULL AND is_teacher());

-- Students see published courses they have access to
CREATE POLICY tc_select_student ON theoretical_courses
    FOR SELECT USING (
        deleted_at IS NULL
        AND is_published = true
        AND is_student()
        AND EXISTS (
            SELECT 1 FROM theoretical_course_access tca
            WHERE tca.course_id = theoretical_courses.id
            AND tca.user_id = auth.uid()
        )
    );

-- Only admins and teachers can create courses
CREATE POLICY tc_insert ON theoretical_courses
    FOR INSERT WITH CHECK (is_admin_or_teacher());

-- Only the creator or admins can update
CREATE POLICY tc_update ON theoretical_courses
    FOR UPDATE USING (created_by = auth.uid() OR is_admin());

-- Only the creator or admins can delete
CREATE POLICY tc_delete ON theoretical_courses
    FOR DELETE USING (created_by = auth.uid() OR is_admin());

-- ---- theoretical_lessons ----

-- Admins see all non-deleted lessons
CREATE POLICY tl_select_admin ON theoretical_lessons
    FOR SELECT USING (deleted_at IS NULL AND is_admin());

-- Teachers see all non-deleted lessons
CREATE POLICY tl_select_teacher ON theoretical_lessons
    FOR SELECT USING (deleted_at IS NULL AND is_teacher());

-- Students see published lessons in courses they have access to
CREATE POLICY tl_select_student ON theoretical_lessons
    FOR SELECT USING (
        deleted_at IS NULL
        AND is_published = true
        AND is_student()
        AND EXISTS (
            SELECT 1 FROM theoretical_course_access tca
            WHERE tca.course_id = theoretical_lessons.course_id
            AND tca.user_id = auth.uid()
        )
    );

-- Only admins and teachers can create lessons
CREATE POLICY tl_insert ON theoretical_lessons
    FOR INSERT WITH CHECK (is_admin_or_teacher());

-- Only course creator or admins can update
CREATE POLICY tl_update ON theoretical_lessons
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM theoretical_courses tc
            WHERE tc.id = theoretical_lessons.course_id
            AND (tc.created_by = auth.uid() OR is_admin())
        )
    );

-- Only course creator or admins can delete
CREATE POLICY tl_delete ON theoretical_lessons
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM theoretical_courses tc
            WHERE tc.id = theoretical_lessons.course_id
            AND (tc.created_by = auth.uid() OR is_admin())
        )
    );

-- ---- theoretical_course_access ----

-- Admins see all access records
CREATE POLICY tca_select_admin ON theoretical_course_access
    FOR SELECT USING (is_admin());

-- Teachers see access for courses they created
CREATE POLICY tca_select_teacher ON theoretical_course_access
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM theoretical_courses tc
            WHERE tc.id = theoretical_course_access.course_id
            AND tc.created_by = auth.uid()
        )
    );

-- Students can see their own access records
CREATE POLICY tca_select_own ON theoretical_course_access
    FOR SELECT USING (user_id = auth.uid());

-- Only admins and teachers can grant access
CREATE POLICY tca_insert ON theoretical_course_access
    FOR INSERT WITH CHECK (is_admin_or_teacher());

-- Only course creator or admins can revoke access
CREATE POLICY tca_delete ON theoretical_course_access
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM theoretical_courses tc
            WHERE tc.id = theoretical_course_access.course_id
            AND (tc.created_by = auth.uid() OR is_admin())
        )
    );

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON theoretical_courses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON theoretical_lessons TO authenticated;
GRANT SELECT, INSERT, DELETE ON theoretical_course_access TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE theoretical_courses IS 'Structured theory courses (book-like containers)';
COMMENT ON TABLE theoretical_lessons IS 'Individual chapters within a theory course';
COMMENT ON TABLE theoretical_course_access IS 'Per-user access control for theory courses';
COMMENT ON COLUMN theoretical_courses.is_published IS 'Whether the course is visible to students with access';
COMMENT ON COLUMN theoretical_courses.sort_order IS 'Display ordering in catalog';
COMMENT ON COLUMN theoretical_lessons.content IS 'Markdown content for the chapter';
COMMENT ON COLUMN theoretical_lessons.excerpt IS 'Short preview text shown in chapter lists';
COMMENT ON COLUMN theoretical_lessons.sort_order IS 'Chapter ordering within the course';
