-- ============================================================================
-- Migration: Song Videos
-- Store video metadata for songs uploaded to Google Drive
-- ============================================================================

-- ============================================================================
-- TABLE
-- ============================================================================

CREATE TABLE song_videos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id       uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  uploaded_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Google Drive
  google_drive_file_id    text UNIQUE NOT NULL,
  google_drive_folder_id  text,

  -- Metadata
  title             text NOT NULL DEFAULT '',
  filename          text NOT NULL,
  mime_type         text NOT NULL,
  file_size_bytes   bigint,
  duration_seconds  numeric(8,2),
  thumbnail_url     text,
  display_order     integer NOT NULL DEFAULT 0,

  -- Future: social publishing
  published_to_instagram    boolean NOT NULL DEFAULT false,
  published_to_tiktok       boolean NOT NULL DEFAULT false,
  published_to_youtube_shorts boolean NOT NULL DEFAULT false,
  instagram_media_id        text,
  tiktok_media_id           text,
  youtube_shorts_id         text,

  -- Timestamps
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_song_videos_song_id ON song_videos(song_id);
CREATE INDEX idx_song_videos_drive_file ON song_videos(google_drive_file_id);
CREATE INDEX idx_song_videos_song_order ON song_videos(song_id, display_order);

-- ============================================================================
-- TRIGGER: auto-update updated_at
-- ============================================================================

CREATE TRIGGER set_song_videos_updated_at
  BEFORE UPDATE ON song_videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS
-- ============================================================================

ALTER TABLE song_videos ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view videos
CREATE POLICY song_videos_select ON song_videos
  FOR SELECT TO authenticated
  USING (true);

-- Teachers and admins can insert
CREATE POLICY song_videos_insert ON song_videos
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_or_teacher());

-- Teachers and admins can update
CREATE POLICY song_videos_update ON song_videos
  FOR UPDATE TO authenticated
  USING (is_admin_or_teacher());

-- Teachers and admins can delete
CREATE POLICY song_videos_delete ON song_videos
  FOR DELETE TO authenticated
  USING (is_admin_or_teacher());

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON song_videos TO authenticated;
