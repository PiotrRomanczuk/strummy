-- Migration: Add match metadata columns to song_videos table
-- Description: Tracks match confidence score and source (auto/manual/spotify) for audit trail and quality metrics
-- Date: 2026-02-15

-- Add match_confidence column to track matching algorithm score
ALTER TABLE song_videos
ADD COLUMN IF NOT EXISTS match_confidence INTEGER CHECK (match_confidence >= 0 AND match_confidence <= 100);

-- Add match_source column to track how the video was matched
ALTER TABLE song_videos
ADD COLUMN IF NOT EXISTS match_source VARCHAR(20)
CHECK (match_source IN ('auto', 'manual', 'spotify'));

-- Add comments for documentation
COMMENT ON COLUMN song_videos.match_confidence IS 'Confidence score (0-100) from the matching algorithm. Higher scores indicate better matches.';
COMMENT ON COLUMN song_videos.match_source IS 'Source of the match: auto (algorithm), manual (admin override), spotify (created from Spotify track).';

-- Create index for querying by match quality
CREATE INDEX IF NOT EXISTS idx_song_videos_match_confidence ON song_videos(match_confidence);
CREATE INDEX IF NOT EXISTS idx_song_videos_match_source ON song_videos(match_source);
