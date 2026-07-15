-- ============================================================================
-- Migration: Scope teacher profile visibility to their own students
-- Guitar CRM
-- ============================================================================
-- Confirmed IDOR (browser QA, 2026-07-15): as Teacher, /dashboard/users
-- correctly lists only that teacher's own students, but navigating directly
-- to another teacher's student's /dashboard/users/[id] renders the full
-- profile (name, email, stats, repertoire, lessons) anyway. Root cause is
-- two overlapping permissive SELECT policies on `profiles`:
--
--   1. profiles_select_teacher (022_rls_policies.sql): USING (is_teacher())
--      — a legacy policy with NO row-level scoping at all. Any teacher can
--      read ANY profile (any student, any other teacher, even admins),
--      active or not. Same "old broad policy never cleaned up when a
--      newer one landed" pattern as the lessons_update/lessons_delete fix
--      in 20260715120001.
--   2. "Teachers can read all profiles" (20260616130000_soft_delete_users):
--      USING (is_teacher() AND (is_active = true OR id = auth.uid())).
--      Correctly hides deactivated profiles, but still grants visibility
--      into every OTHER teacher's active students — not just the caller's
--      own roster.
--
-- Since Postgres OR's permissive policies together, #1 alone defeats #2's
-- intent, and #2 is itself too broad for a multi-teacher deployment (the
-- app already scopes list queries to the caller's own roster — RLS should
-- enforce the same boundary for direct reads, per ADR-0001).
--
-- Fix: drop the unscoped legacy policy outright, and re-scope "Teachers can
-- read all profiles" to the same "Teaches" relationship (non-deleted lesson
-- exists) already used by the teacher_students view and by
-- 20260715120002's mirror-image profiles_select_own_teacher policy.
-- ============================================================================

DROP POLICY IF EXISTS "profiles_select_teacher" ON profiles;
DROP POLICY IF EXISTS "Teachers can read all profiles" ON profiles;

CREATE POLICY "Teachers can read all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  (
    public.has_role('teacher')
    AND (
      id = auth.uid()
      OR (
        is_active = true
        AND EXISTS (
          SELECT 1 FROM lessons
          WHERE lessons.student_id = profiles.id
          AND lessons.teacher_id = auth.uid()
          AND lessons.deleted_at IS NULL
        )
      )
    )
  )
  OR public.is_admin()
);
