-- Add short_title column to songs table
-- Migration: add_short_title_to_songs.sql
-- Issue: PGRST204 - short_title column missing from songs table

-- Add short_title column (optional field for abbreviated song names)
ALTER TABLE songs ADD COLUMN short_title VARCHAR(50);

-- Add comment explaining the column
COMMENT ON COLUMN songs.short_title IS 'Optional abbreviated title for display in compact views';
