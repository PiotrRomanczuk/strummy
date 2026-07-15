-- ============================================================================
-- Migration: Scope lessons UPDATE/DELETE RLS to the owning teacher
-- Guitar CRM
-- ============================================================================
-- The prior lessons_update_policy / lessons_delete_policy (migration
-- 20251208000001) granted UPDATE and DELETE to ANY user with is_teacher = true,
-- regardless of whether they own the lesson. On a single-teacher deployment
-- this is inert, but it is a horizontal-privilege (IDOR) hole the moment a
-- second teacher exists: teacher B could edit or delete teacher A's lessons.
-- The app layer (updateLessonAction) intentionally delegates row scoping to
-- RLS, so RLS must enforce ownership.
--
-- There is also a second, older, duplicate pair of permissive policies
-- (lessons_update / lessons_delete, from 022_rls_policies.sql) built on
-- is_admin_or_teacher() — same unscoped "any teacher" grant. Postgres RLS
-- policies for the same command are OR'd together, so replacing only
-- lessons_update_policy/lessons_delete_policy would leave the hole wide open
-- via this older pair. Both must be dropped for the fix to take effect.
--
-- New policy: admins may update/delete any lesson; teachers only their own
-- (teacher_id = auth.uid()). SELECT and INSERT policies are unchanged.
-- ============================================================================

DROP POLICY IF EXISTS "lessons_update_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_delete_policy" ON lessons;
DROP POLICY IF EXISTS "lessons_update" ON lessons;
DROP POLICY IF EXISTS "lessons_delete" ON lessons;

CREATE POLICY "lessons_update_policy" ON lessons
    FOR UPDATE USING (
        -- Admins can update any lesson
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
        OR
        -- Teachers can update only lessons they own
        (
            teacher_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.is_teacher = true
            )
        )
    );

CREATE POLICY "lessons_delete_policy" ON lessons
    FOR DELETE USING (
        -- Admins can delete any lesson
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
        OR
        -- Teachers can delete only lessons they own
        (
            teacher_id = auth.uid()
            AND EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND profiles.is_teacher = true
            )
        )
    );
