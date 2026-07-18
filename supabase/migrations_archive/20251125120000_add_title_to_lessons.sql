-- Add title column to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS title text;
