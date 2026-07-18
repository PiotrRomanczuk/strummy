-- ============================================================================
-- Migration: Critical DB Fixes
-- Tickets: KAN-19, KAN-20, KAN-21
-- ============================================================================
--
-- KAN-19: Add composite indexes for lessons and assignments tables
-- KAN-20: Fix soft-delete RLS leak — add deleted_at IS NULL checks
-- KAN-21: RLS on theoretical_courses and theoretical_lessons (already enabled
--         in 20260214100000_table_theoretical_lessons.sql — verified below)
--
-- NOTE: CREATE INDEX CONCURRENTLY cannot run inside a transaction block.
-- This file must be applied outside an explicit transaction (Supabase Dashboard
-- SQL editor or `supabase db push` handle this automatically).
-- ============================================================================


-- ============================================================================
-- KAN-19: Composite indexes
-- ============================================================================

-- lessons(teacher_id, scheduled_at) — used in every teacher dashboard load.
-- The v2 schema already creates ix_lessons_teacher_scheduled as a partial index;
-- this adds the plain composite variant under a canonical name so both schema
-- tracks are covered.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lessons_teacher_scheduled
    ON lessons(teacher_id, scheduled_at);

-- assignments(status, due_date) — used in assignment filtering UI.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_assignments_status_due
    ON assignments(status, due_date);


-- ============================================================================
-- KAN-20: Fix soft-delete RLS leak on lessons
-- ============================================================================
-- The policies created by 022_rls_policies.sql and 20251208000001 do NOT
-- include "deleted_at IS NULL", allowing soft-deleted rows to surface.
-- Drop every known variant and recreate with the guard.

-- Drop all existing lessons SELECT policies (both v1 and v2 naming schemes)
DROP POLICY IF EXISTS lessons_select_admin   ON lessons;
DROP POLICY IF EXISTS lessons_select_teacher ON lessons;
DROP POLICY IF EXISTS lessons_select_student ON lessons;
DROP POLICY IF EXISTS "lessons_select_policy" ON lessons;

-- Admins see all non-deleted lessons
CREATE POLICY lessons_select_admin ON lessons
    FOR SELECT USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Teachers see their own non-deleted lessons
CREATE POLICY lessons_select_teacher ON lessons
    FOR SELECT USING (
        deleted_at IS NULL
        AND teacher_id = auth.uid()
    );

-- Students see their own non-deleted lessons
CREATE POLICY lessons_select_student ON lessons
    FOR SELECT USING (
        deleted_at IS NULL
        AND student_id = auth.uid()
    );


-- ============================================================================
-- KAN-20: Fix soft-delete RLS leak on assignments
-- ============================================================================

-- Drop all existing assignments SELECT policies (both v1 and v2 naming schemes)
DROP POLICY IF EXISTS assignments_select_admin   ON assignments;
DROP POLICY IF EXISTS assignments_select_teacher ON assignments;
DROP POLICY IF EXISTS assignments_select_student ON assignments;
DROP POLICY IF EXISTS "assignments_select_policy" ON assignments;

-- Admins see all non-deleted assignments
CREATE POLICY assignments_select_admin ON assignments
    FOR SELECT USING (
        deleted_at IS NULL
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

-- Teachers see their own non-deleted assignments
CREATE POLICY assignments_select_teacher ON assignments
    FOR SELECT USING (
        deleted_at IS NULL
        AND teacher_id = auth.uid()
    );

-- Students see assignments assigned to them (non-deleted only)
CREATE POLICY assignments_select_student ON assignments
    FOR SELECT USING (
        deleted_at IS NULL
        AND student_id = auth.uid()
    );


-- ============================================================================
-- KAN-21: RLS on theoretical_courses and theoretical_lessons
-- ============================================================================
-- Migration 20260214100000_table_theoretical_lessons.sql already runs:
--   ALTER TABLE theoretical_courses ENABLE ROW LEVEL SECURITY;
--   ALTER TABLE theoretical_lessons ENABLE ROW LEVEL SECURITY;
-- and creates full role-based policies (tc_select_admin, tc_select_teacher,
-- tc_select_student, tc_insert, tc_update, tc_delete, and the tl_* equivalents).
--
-- The statements below are idempotent safety guards in case the tables were
-- created by an alternate migration path that skipped those definitions.

ALTER TABLE theoretical_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE theoretical_lessons ENABLE ROW LEVEL SECURITY;

-- theoretical_courses policies (IF NOT EXISTS requires PG 15+; we use
-- DROP IF EXISTS + CREATE to stay compatible with PG 14 on Supabase)
DO $$
BEGIN
    -- tc_select_admin
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'theoretical_courses'
          AND policyname = 'tc_select_admin'
    ) THEN
        CREATE POLICY tc_select_admin ON theoretical_courses
            FOR SELECT USING (deleted_at IS NULL AND is_admin());
    END IF;

    -- tc_select_teacher
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'theoretical_courses'
          AND policyname = 'tc_select_teacher'
    ) THEN
        CREATE POLICY tc_select_teacher ON theoretical_courses
            FOR SELECT USING (deleted_at IS NULL AND is_teacher());
    END IF;

    -- tc_select_student
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'theoretical_courses'
          AND policyname = 'tc_select_student'
    ) THEN
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
    END IF;

    -- tc_insert
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'theoretical_courses'
          AND policyname = 'tc_insert'
    ) THEN
        CREATE POLICY tc_insert ON theoretical_courses
            FOR INSERT WITH CHECK (is_admin_or_teacher());
    END IF;

    -- tc_update
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'theoretical_courses'
          AND policyname = 'tc_update'
    ) THEN
        CREATE POLICY tc_update ON theoretical_courses
            FOR UPDATE USING (created_by = auth.uid() OR is_admin());
    END IF;

    -- tc_delete
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'theoretical_courses'
          AND policyname = 'tc_delete'
    ) THEN
        CREATE POLICY tc_delete ON theoretical_courses
            FOR DELETE USING (created_by = auth.uid() OR is_admin());
    END IF;
END $$;

DO $$
BEGIN
    -- tl_select_admin
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'theoretical_lessons'
          AND policyname = 'tl_select_admin'
    ) THEN
        CREATE POLICY tl_select_admin ON theoretical_lessons
            FOR SELECT USING (deleted_at IS NULL AND is_admin());
    END IF;

    -- tl_select_teacher
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'theoretical_lessons'
          AND policyname = 'tl_select_teacher'
    ) THEN
        CREATE POLICY tl_select_teacher ON theoretical_lessons
            FOR SELECT USING (deleted_at IS NULL AND is_teacher());
    END IF;

    -- tl_select_student
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'theoretical_lessons'
          AND policyname = 'tl_select_student'
    ) THEN
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
    END IF;

    -- tl_insert
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'theoretical_lessons'
          AND policyname = 'tl_insert'
    ) THEN
        CREATE POLICY tl_insert ON theoretical_lessons
            FOR INSERT WITH CHECK (is_admin_or_teacher());
    END IF;

    -- tl_update
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'theoretical_lessons'
          AND policyname = 'tl_update'
    ) THEN
        CREATE POLICY tl_update ON theoretical_lessons
            FOR UPDATE USING (
                EXISTS (
                    SELECT 1 FROM theoretical_courses tc
                    WHERE tc.id = theoretical_lessons.course_id
                    AND (tc.created_by = auth.uid() OR is_admin())
                )
            );
    END IF;

    -- tl_delete
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'theoretical_lessons'
          AND policyname = 'tl_delete'
    ) THEN
        CREATE POLICY tl_delete ON theoretical_lessons
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM theoretical_courses tc
                    WHERE tc.id = theoretical_lessons.course_id
                    AND (tc.created_by = auth.uid() OR is_admin())
                )
            );
    END IF;
END $$;
