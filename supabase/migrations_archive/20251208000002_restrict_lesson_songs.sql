-- Restrict access to lesson_songs based on lesson visibility
-- Migration: 20251208000002_restrict_lesson_songs.sql

ALTER TABLE lesson_songs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "lesson_songs_select_policy" ON lesson_songs;
DROP POLICY IF EXISTS "lesson_songs_insert_policy" ON lesson_songs;
DROP POLICY IF EXISTS "lesson_songs_update_policy" ON lesson_songs;
DROP POLICY IF EXISTS "lesson_songs_delete_policy" ON lesson_songs;

-- SELECT: Visible if the associated lesson is visible
-- This relies on the RLS policy of the 'lessons' table.
CREATE POLICY "lesson_songs_select_policy" ON lesson_songs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lessons
            WHERE lessons.id = lesson_songs.lesson_id
        )
    );

-- INSERT: Only Admins and Teachers
CREATE POLICY "lesson_songs_insert_policy" ON lesson_songs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_admin = true OR profiles.is_teacher = true)
        )
    );

-- UPDATE: Only Admins and Teachers
CREATE POLICY "lesson_songs_update_policy" ON lesson_songs
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_admin = true OR profiles.is_teacher = true)
        )
    );

-- DELETE: Only Admins and Teachers
CREATE POLICY "lesson_songs_delete_policy" ON lesson_songs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_admin = true OR profiles.is_teacher = true)
        )
    );
