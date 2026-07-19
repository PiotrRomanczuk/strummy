-- Add notes column to songs table for AI-generated teaching tips and practice suggestions
ALTER TABLE songs ADD COLUMN IF NOT EXISTS notes TEXT;
