-- Add soft delete functionality to songs table
-- Migration: 20251109195040_add_soft_delete_to_songs.sql

-- Add deleted_at column to songs table
ALTER TABLE songs ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index on deleted_at for performance
CREATE INDEX idx_songs_deleted_at ON songs(deleted_at);

-- Update RLS policies to exclude soft-deleted songs by default
-- Drop existing policies first
DROP POLICY IF EXISTS "songs_select_policy" ON songs;
DROP POLICY IF EXISTS "songs_insert_policy" ON songs;
DROP POLICY IF EXISTS "songs_update_policy" ON songs;
DROP POLICY IF EXISTS "songs_delete_policy" ON songs;

-- Recreate policies with soft delete consideration
CREATE POLICY "songs_select_policy" ON songs
    FOR SELECT USING (
        deleted_at IS NULL AND (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND (profiles.is_admin = true OR profiles.is_teacher = true OR profiles.is_student = true)
            )
        )
    );

CREATE POLICY "songs_insert_policy" ON songs
    FOR INSERT WITH CHECK (
        deleted_at IS NULL AND (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND (profiles.is_admin = true OR profiles.is_teacher = true)
            )
        )
    );

CREATE POLICY "songs_update_policy" ON songs
    FOR UPDATE USING (
        deleted_at IS NULL AND (
            EXISTS (
                SELECT 1 FROM profiles
                WHERE profiles.id = auth.uid()
                AND (profiles.is_admin = true OR profiles.is_teacher = true)
            )
        )
    );

CREATE POLICY "songs_delete_policy" ON songs
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_admin = true OR profiles.is_teacher = true)
        )
    );

-- Create a function to check if a song has active lesson assignments
CREATE OR REPLACE FUNCTION has_active_lesson_assignments(song_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM lesson_songs ls
        JOIN lessons l ON ls.lesson_id = l.id
        WHERE ls.song_id = song_uuid
        AND l.status IN ('SCHEDULED', 'IN_PROGRESS')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to soft delete a song with cascade handling
CREATE OR REPLACE FUNCTION soft_delete_song_with_cascade(song_uuid UUID, user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    song_record RECORD;
    lesson_assignments_count INTEGER;
    result JSON;
BEGIN
    -- Check if song exists and is not already deleted
    SELECT * INTO song_record FROM songs WHERE id = song_uuid AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Song not found or already deleted');
    END IF;

    -- Check for active lesson assignments
    IF has_active_lesson_assignments(song_uuid) THEN
        RETURN json_build_object('success', false, 'error', 'Cannot delete song with active lesson assignments');
    END IF;

    -- Count related records before deletion
    SELECT COUNT(*) INTO lesson_assignments_count FROM lesson_songs WHERE song_id = song_uuid;

    -- Soft delete the song
    UPDATE songs SET deleted_at = NOW() WHERE id = song_uuid;

    -- Cascade: Remove lesson song assignments (hard delete since they're junction records)
    DELETE FROM lesson_songs WHERE song_id = song_uuid;

    -- Return success with counts
    RETURN json_build_object(
        'success', true,
        'lesson_assignments_removed', lesson_assignments_count,
        'favorite_assignments_removed', 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;