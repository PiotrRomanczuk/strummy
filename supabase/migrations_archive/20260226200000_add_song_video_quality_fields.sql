-- Migration: Add quality metadata columns to song_videos
-- Description: Track video recording quality for admin review
-- These fields are already referenced by admin drive-videos UI components
-- Date: 2026-02-26

ALTER TABLE song_videos
ADD COLUMN IF NOT EXISTS is_recording_correct BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE song_videos
ADD COLUMN IF NOT EXISTS is_well_lit BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE song_videos
ADD COLUMN IF NOT EXISTS mic_type VARCHAR(20) CHECK (mic_type IN ('iphone', 'external'));

ALTER TABLE song_videos
ADD COLUMN IF NOT EXISTS is_audio_mixed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE song_videos
ADD COLUMN IF NOT EXISTS is_video_edited BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN song_videos.is_recording_correct IS 'Whether the recording has no performance mistakes';
COMMENT ON COLUMN song_videos.is_well_lit IS 'Whether the video has good lighting';
COMMENT ON COLUMN song_videos.mic_type IS 'Microphone used: iphone (built-in) or external';
COMMENT ON COLUMN song_videos.is_audio_mixed IS 'Whether the audio has been mixed/mastered';
COMMENT ON COLUMN song_videos.is_video_edited IS 'Whether the video has been edited (cuts, transitions, etc.)';
