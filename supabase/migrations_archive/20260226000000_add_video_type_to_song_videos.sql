-- Add video_type enum and make song_id nullable for standalone shorts
CREATE TYPE video_type AS ENUM ('tutorial', 'short');

ALTER TABLE song_videos ADD COLUMN IF NOT EXISTS video_type video_type NOT NULL DEFAULT 'tutorial';

-- Make song_id nullable so shorts can exist without a song
ALTER TABLE song_videos ALTER COLUMN song_id DROP NOT NULL;

-- Index for the shorts page (fetch all shorts efficiently)
CREATE INDEX idx_song_videos_type ON song_videos(video_type);
