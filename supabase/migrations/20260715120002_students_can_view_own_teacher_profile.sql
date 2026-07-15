-- ============================================================================
-- Migration: Students can view the profile of their own teacher
-- Guitar CRM
-- ============================================================================
-- Companion to 20260715120001 (lessons UPDATE/DELETE ownership) and the
-- /api/lessons GET fix (app/api/lessons/route.ts, .../[id]/route.ts — now
-- using the RLS-respecting client instead of the admin/service-role client).
--
-- Without this policy, a student's own lesson list/detail would correctly
-- stop leaking OTHER students' data (the IDOR fix), but would also silently
-- lose their OWN teacher's name/email in the `teacher_profile` join — no
-- existing `profiles` SELECT policy lets a student read any profile but
-- their own (profiles_select_own / select_own_or_admin_profile). Teachers
-- already have the mirror-image grant ("Teachers can read all profiles").
--
-- Scoped via the same "Teaches" relationship as the teacher_students view
-- (spec: CONTEXT.md) — a student may read a teacher's profile iff a
-- non-deleted lesson exists between them.
-- ============================================================================

CREATE POLICY "profiles_select_own_teacher" ON profiles
    FOR SELECT USING (
        is_teacher = true
        AND EXISTS (
            SELECT 1 FROM lessons
            WHERE lessons.teacher_id = profiles.id
            AND lessons.student_id = auth.uid()
            AND lessons.deleted_at IS NULL
        )
    );
