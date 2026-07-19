-- Restrict student access to lessons and assignments
-- Migration: 20251208000001_restrict_student_lessons_assignments.sql

-- ==========================================
-- LESSONS
-- ==========================================

-- Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "select_lessons_participants" ON lessons;
DROP POLICY IF EXISTS "insert_lessons_admin" ON lessons;
DROP POLICY IF EXISTS "update_lessons_admin" ON lessons;
DROP POLICY IF EXISTS "delete_lessons_admin" ON lessons;
DROP POLICY IF EXISTS "lessons_select_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_insert_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_update_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_delete_policy" ON lessons;

-- Create new policies
CREATE POLICY "lessons_select_policy" ON lessons
    FOR SELECT USING (
        -- Admin or Teacher (can see all? or just their own? usually admins see all, teachers see theirs)
        -- For now, let's allow Admins to see all, Teachers to see theirs, Students to see theirs.
        (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.is_admin = true
            )
        )
        OR
        teacher_id = auth.uid()
        OR
        student_id = auth.uid()
    );

CREATE POLICY "lessons_insert_policy" ON lessons
    FOR INSERT WITH CHECK (
        -- Only Admins and Teachers can insert
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_admin = true OR profiles.is_teacher = true)
        )
    );

CREATE POLICY "lessons_update_policy" ON lessons
    FOR UPDATE USING (
        -- Only Admins and Teachers can update
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_admin = true OR profiles.is_teacher = true)
        )
    );

CREATE POLICY "lessons_delete_policy" ON lessons
    FOR DELETE USING (
        -- Only Admins and Teachers can delete
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_admin = true OR profiles.is_teacher = true)
        )
    );


-- ==========================================
-- ASSIGNMENTS
-- ==========================================

-- Drop existing policies
DROP POLICY IF EXISTS "select_assignments_user_or_admin" ON assignments;
DROP POLICY IF EXISTS "insert_assignments_user_or_admin" ON assignments;
DROP POLICY IF EXISTS "update_assignments_user_or_admin" ON assignments;
DROP POLICY IF EXISTS "delete_assignments_admin_or_teacher" ON assignments;
DROP POLICY IF EXISTS "assignments_select_policy" ON assignments;
DROP POLICY IF EXISTS "assignments_insert_policy" ON assignments;
DROP POLICY IF EXISTS "assignments_update_policy" ON assignments;
DROP POLICY IF EXISTS "assignments_delete_policy" ON assignments;

-- Create new policies
CREATE POLICY "assignments_select_policy" ON assignments
    FOR SELECT USING (
        -- Admin can see all
        (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.is_admin = true
            )
        )
        OR
        -- Teacher can see assignments they created/manage
        teacher_id = auth.uid()
        OR
        -- Student can see assignments assigned to them
        student_id = auth.uid()
    );

CREATE POLICY "assignments_insert_policy" ON assignments
    FOR INSERT WITH CHECK (
        -- Only Admins and Teachers can insert
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_admin = true OR profiles.is_teacher = true)
        )
    );

CREATE POLICY "assignments_update_policy" ON assignments
    FOR UPDATE USING (
        -- Only Admins and Teachers can update
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_admin = true OR profiles.is_teacher = true)
        )
    );

CREATE POLICY "assignments_delete_policy" ON assignments
    FOR DELETE USING (
        -- Only Admins and Teachers can delete
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_admin = true OR profiles.is_teacher = true)
        )
    );
