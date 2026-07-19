-- ============================================================================
-- Migration: Fix song_videos RLS - restrict students to assigned songs only
-- KAN-15
-- ============================================================================
-- Problem: the original song_videos_select policy used USING (true), which
-- allowed every authenticated user (including students) to read videos for
-- any song, regardless of whether that song was assigned to them.
--
-- Fix: replace the single permissive policy with two separate policies:
--   1. Admins and teachers can see all videos (unchanged behaviour for staff)
--   2. Students can only see videos for songs present in their
--      student_repertoire or linked via lesson_songs -> lessons
-- ============================================================================

-- Drop the old catch-all SELECT policy
DROP POLICY IF EXISTS song_videos_select ON song_videos;

-- Policy 1: Admins and teachers see all videos
CREATE POLICY song_videos_select_staff ON song_videos
  FOR SELECT TO authenticated
  USING (is_admin_or_teacher());

-- Policy 2: Students see videos only for songs assigned to them.
--
-- A song is considered assigned when at least one of the following is true:
--   a) The song appears in the student's student_repertoire (primary source of truth)
--   b) The song appears in a lesson_song row whose parent lesson has the student
--      as student_id (legacy / fallback path)
--
-- Using OR keeps both assignment paths supported without a UNION.
CREATE POLICY song_videos_select_student ON song_videos
  FOR SELECT TO authenticated
  USING (
    -- Must be a student role
    is_student()
    AND (
      -- Path A: song is in student_repertoire
      EXISTS (
        SELECT 1
        FROM student_repertoire sr
        WHERE sr.song_id = song_videos.song_id
          AND sr.student_id = auth.uid()
      )
      OR
      -- Path B: song appears in a lesson assigned to this student
      EXISTS (
        SELECT 1
        FROM lesson_songs ls
        JOIN lessons l ON l.id = ls.lesson_id
        WHERE ls.song_id = song_videos.song_id
          AND l.student_id = auth.uid()
          AND l.deleted_at IS NULL
      )
    )
  );
