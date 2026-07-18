-- Add missing song metadata columns
-- These columns support additional song information in the form

ALTER TABLE songs
ADD COLUMN IF NOT EXISTS capo_fret INTEGER,
ADD COLUMN IF NOT EXISTS strumming_pattern TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS spotify_link_url TEXT,
ADD COLUMN IF NOT EXISTS tempo INTEGER,
ADD COLUMN IF NOT EXISTS time_signature INTEGER,
ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
ADD COLUMN IF NOT EXISTS release_year INTEGER,
ADD COLUMN IF NOT EXISTS audio_files JSONB DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN songs.capo_fret IS 'Capo position (0-20), null means no capo';
COMMENT ON COLUMN songs.strumming_pattern IS 'Strumming pattern description (e.g., D-DU-UDU)';
COMMENT ON COLUMN songs.category IS 'Song category or genre';
COMMENT ON COLUMN songs.cover_image_url IS 'URL to song cover image';
COMMENT ON COLUMN songs.spotify_link_url IS 'Spotify track URL';
COMMENT ON COLUMN songs.tempo IS 'Song tempo in BPM';
COMMENT ON COLUMN songs.time_signature IS 'Time signature numerator (e.g., 4 for 4/4)';
COMMENT ON COLUMN songs.duration_ms IS 'Song duration in milliseconds';
COMMENT ON COLUMN songs.release_year IS 'Year the song was released';
COMMENT ON COLUMN songs.audio_files IS 'JSONB object mapping audio type to URL';
