-- Restrict student access to songs
-- Migration: 20251208000000_restrict_student_songs.sql

-- Drop existing select policy
DROP POLICY IF EXISTS "songs_select_policy" ON songs;

-- Create new policy
-- Admins and Teachers can see all songs
-- Students can only see songs assigned to them via lesson_songs -> lessons
CREATE POLICY "songs_select_policy" ON songs
    FOR SELECT USING (
        deleted_at IS NULL AND (
            -- Admin or Teacher check
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND (profiles.is_admin = true OR profiles.is_teacher = true)
            )
            OR
            -- Student check: Must have an assignment
            (
                EXISTS (
                    SELECT 1 FROM profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.is_student = true
                )
                AND
                EXISTS (
                    SELECT 1 FROM lesson_songs ls
                    JOIN lessons l ON ls.lesson_id = l.id
                    WHERE ls.song_id = songs.id
                    AND l.student_id = auth.uid()
                )
            )
        )
    );
