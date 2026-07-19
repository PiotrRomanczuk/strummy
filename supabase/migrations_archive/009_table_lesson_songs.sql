-- ============================================================================
-- Migration 009: Lesson Songs Junction Table
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Links songs to lessons with progress tracking

CREATE TABLE lesson_songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,

    -- Progress tracking
    status song_progress_status NOT NULL DEFAULT 'to_learn',

    -- Notes specific to this song in this lesson
    notes medium_text,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Each song can only be added once per lesson
    CONSTRAINT uq_lesson_songs UNIQUE (lesson_id, song_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Lookup by lesson
CREATE INDEX ix_lesson_songs_lesson ON lesson_songs(lesson_id);

-- Lookup by song (for "which lessons use this song")
CREATE INDEX ix_lesson_songs_song ON lesson_songs(song_id);

-- Status filtering
CREATE INDEX ix_lesson_songs_status ON lesson_songs(status);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER tr_lesson_songs_updated_at
    BEFORE UPDATE ON lesson_songs
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE lesson_songs IS 'Junction table linking songs to lessons with progress tracking';
COMMENT ON COLUMN lesson_songs.status IS 'Learning status: to_learn -> started -> remembered -> with_author -> mastered';
COMMENT ON COLUMN lesson_songs.notes IS 'Teacher notes about this song for this specific lesson';
