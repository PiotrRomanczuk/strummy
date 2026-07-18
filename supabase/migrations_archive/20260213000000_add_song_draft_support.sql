-- Migration: Add draft support for songs
-- Description: Allow teachers to save incomplete songs as drafts
-- Date: 2026-02-13
-- Ticket: BMS-257

-- Add is_draft column to songs table
ALTER TABLE songs
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for filtering drafts efficiently
CREATE INDEX IF NOT EXISTS ix_songs_is_draft
ON songs(is_draft)
WHERE is_draft = TRUE;

-- Add comment explaining the field
COMMENT ON COLUMN songs.is_draft IS
'True if song is saved as draft (incomplete). Drafts are not visible to students and can be completed later by teachers.';

-- Update RLS policies to exclude drafts from student view
-- (Students should not see draft songs)
DROP POLICY IF EXISTS "Songs: Students can view assigned songs" ON songs;

CREATE POLICY "Songs: Students can view assigned songs" ON songs
FOR SELECT
TO authenticated
USING (
  -- Only allow students to see non-draft songs assigned to their lessons
  is_draft = FALSE
  AND EXISTS (
    SELECT 1
    FROM lesson_songs ls
    INNER JOIN lessons l ON ls.lesson_id = l.id
    WHERE ls.song_id = songs.id
      AND l.student_id = auth.uid()
  )
);

-- Admin and teacher policies remain unchanged (they can see drafts)
-- Verify existing staff policy doesn't need updates
-- Staff can already see all songs including drafts
