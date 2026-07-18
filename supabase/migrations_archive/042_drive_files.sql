-- ============================================================================
-- Migration 042: Drive Files
-- Guitar CRM - Unified file management for all Drive file types
-- ============================================================================
-- Polymorphic file table that can attach to lessons, songs, assignments, profiles
-- Supports audio, PDF, video, document, and image files

-- ============================================================================
-- DRIVE FILES TABLE
-- ============================================================================

CREATE TABLE drive_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Polymorphic relationships
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('song', 'lesson', 'assignment', 'profile')),
  entity_id UUID NOT NULL,

  -- Google Drive reference
  google_drive_file_id TEXT UNIQUE NOT NULL,
  google_drive_folder_id TEXT,

  -- File metadata
  file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('audio', 'pdf', 'video', 'document', 'image')),
  filename TEXT NOT NULL,
  title TEXT,
  description TEXT,
  mime_type TEXT NOT NULL,
  file_size_bytes BIGINT,

  -- Type-specific metadata (JSONB for flexibility)
  -- Examples:
  --   audio: {"duration_seconds": 180, "artist": "...", "album": "..."}
  --   pdf: {"page_count": 5}
  --   video: {"duration_seconds": 120, "thumbnail_url": "..."}
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Visibility control
  visibility VARCHAR(20) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'students', 'public')),

  -- Display order
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Performance indexes for common queries
CREATE INDEX idx_drive_files_entity ON drive_files(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_drive_files_type ON drive_files(file_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_drive_files_drive_id ON drive_files(google_drive_file_id);
CREATE INDEX idx_drive_files_uploaded_by ON drive_files(uploaded_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_drive_files_display_order ON drive_files(entity_type, entity_id, display_order) WHERE deleted_at IS NULL;
CREATE INDEX idx_drive_files_visibility ON drive_files(visibility) WHERE deleted_at IS NULL;

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE TRIGGER update_drive_files_updated_at
  BEFORE UPDATE ON drive_files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE drive_files ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STAFF POLICIES (Admin & Teachers)
-- ============================================================================

-- Staff can view all non-deleted files
CREATE POLICY drive_files_select_staff ON drive_files
  FOR SELECT USING (
    deleted_at IS NULL
    AND is_admin_or_teacher()
  );

-- Staff can insert files
CREATE POLICY drive_files_insert_staff ON drive_files
  FOR INSERT WITH CHECK (
    is_admin_or_teacher()
    AND uploaded_by = auth.uid()
  );

-- Staff can update files
CREATE POLICY drive_files_update_staff ON drive_files
  FOR UPDATE USING (
    deleted_at IS NULL
    AND is_admin_or_teacher()
  );

-- Staff can delete (soft delete) files
CREATE POLICY drive_files_delete_staff ON drive_files
  FOR DELETE USING (
    is_admin_or_teacher()
  );

-- ============================================================================
-- STUDENT POLICIES (Read-only with visibility checks)
-- ============================================================================

-- Students can view files if:
-- 1. File is public, OR
-- 2. File is marked for students AND student has access to the entity
CREATE POLICY drive_files_select_student ON drive_files
  FOR SELECT USING (
    deleted_at IS NULL
    AND is_student()
    AND (
      -- Public files (anyone can see)
      visibility = 'public'

      -- OR files visible to students in their lessons
      OR (
        visibility = 'students'
        AND (
          -- Files attached to lessons the student is enrolled in
          (entity_type = 'lesson' AND EXISTS (
            SELECT 1 FROM lessons
            WHERE id = drive_files.entity_id
            AND student_id = auth.uid()
            AND deleted_at IS NULL
          ))

          -- Files attached to assignments for the student
          OR (entity_type = 'assignment' AND EXISTS (
            SELECT 1 FROM assignments
            WHERE id = drive_files.entity_id
            AND student_id = auth.uid()
          ))

          -- Files attached to songs in the student's lessons
          OR (entity_type = 'song' AND EXISTS (
            SELECT 1 FROM lesson_songs ls
            JOIN lessons l ON ls.lesson_id = l.id
            WHERE ls.song_id = drive_files.entity_id
            AND l.student_id = auth.uid()
            AND l.deleted_at IS NULL
          ))

          -- Files attached to the student's own profile
          OR (entity_type = 'profile' AND drive_files.entity_id = auth.uid())
        )
      )
    )
  );

-- Students cannot insert, update, or delete files
-- (No policies = implicit deny)

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE drive_files IS 'Unified storage for all Google Drive files (audio, PDF, video, document, image) attached to lessons, songs, assignments, or profiles';
COMMENT ON COLUMN drive_files.entity_type IS 'Type of entity the file is attached to: song, lesson, assignment, profile';
COMMENT ON COLUMN drive_files.entity_id IS 'UUID of the entity (not a foreign key to allow polymorphic relationships)';
COMMENT ON COLUMN drive_files.google_drive_file_id IS 'Unique identifier in Google Drive';
COMMENT ON COLUMN drive_files.file_type IS 'Type of file: audio, pdf, video, document, image';
COMMENT ON COLUMN drive_files.visibility IS 'Who can view the file: private (staff only), students (enrolled students), public (anyone)';
COMMENT ON COLUMN drive_files.metadata IS 'Type-specific metadata stored as JSONB (duration, page_count, thumbnail_url, etc.)';
COMMENT ON COLUMN drive_files.display_order IS 'Order in which files are displayed in UI (lower = first)';
COMMENT ON COLUMN drive_files.deleted_at IS 'Soft delete timestamp';
