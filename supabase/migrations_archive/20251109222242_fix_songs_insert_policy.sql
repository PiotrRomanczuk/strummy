-- Fix songs insert policy - remove deleted_at check from WITH CHECK
-- The deleted_at field doesn't exist yet when inserting a new row

DROP POLICY IF EXISTS "songs_insert_policy" ON songs;

CREATE POLICY "songs_insert_policy" ON songs
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_admin = true OR profiles.is_teacher = true)
        )
    );
