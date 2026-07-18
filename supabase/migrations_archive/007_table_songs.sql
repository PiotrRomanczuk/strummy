-- ============================================================================
-- Migration 007: Songs Table
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Song library - independent of users

CREATE TABLE songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core song information
    title VARCHAR(500) NOT NULL,
    author VARCHAR(500),
    short_title VARCHAR(50),

    -- Music attributes
    level difficulty_level,
    key music_key,
    capo_fret SMALLINT CHECK (capo_fret IS NULL OR (capo_fret >= 0 AND capo_fret <= 20)),
    strumming_pattern VARCHAR(255),
    tempo SMALLINT CHECK (tempo IS NULL OR (tempo >= 20 AND tempo <= 300)),
    time_signature SMALLINT CHECK (time_signature IS NULL OR (time_signature >= 1 AND time_signature <= 16)),
    duration_ms positive_int,
    release_year SMALLINT CHECK (release_year IS NULL OR (release_year >= 1900 AND release_year <= 2100)),
    category VARCHAR(255),
    chords medium_text,

    -- External links
    ultimate_guitar_link url,
    youtube_url url,
    spotify_link_url url,
    tiktok_short_url url,

    -- Media
    cover_image_url url,
    gallery_images TEXT[],
    audio_files JSONB DEFAULT '{}'::jsonb,

    -- Full-text search (generated column)
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(author, '')), 'B')
    ) STORED,

    -- Soft delete
    deleted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookups
CREATE INDEX ix_songs_title ON songs(title);
CREATE INDEX ix_songs_author ON songs(author);

-- Soft delete filtering
CREATE INDEX ix_songs_deleted_at ON songs(deleted_at) WHERE deleted_at IS NULL;

-- Full-text search
CREATE INDEX ix_songs_search ON songs USING GIN (search_vector);

-- Trigram indexes for fuzzy matching
CREATE INDEX ix_songs_title_trgm ON songs USING GIN (title gin_trgm_ops);
CREATE INDEX ix_songs_author_trgm ON songs USING GIN (author gin_trgm_ops);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER tr_songs_updated_at
    BEFORE UPDATE ON songs
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE songs IS 'Song library with music attributes and external links';
COMMENT ON COLUMN songs.short_title IS 'Abbreviated title for compact views';
COMMENT ON COLUMN songs.capo_fret IS 'Capo position (0-20), null means no capo';
COMMENT ON COLUMN songs.strumming_pattern IS 'Strumming pattern (e.g., D-DU-UDU)';
COMMENT ON COLUMN songs.tempo IS 'Song tempo in BPM';
COMMENT ON COLUMN songs.time_signature IS 'Time signature numerator (e.g., 4 for 4/4)';
COMMENT ON COLUMN songs.duration_ms IS 'Song duration in milliseconds';
COMMENT ON COLUMN songs.search_vector IS 'Generated tsvector for full-text search';
COMMENT ON COLUMN songs.audio_files IS 'JSONB mapping audio type to URL';
COMMENT ON COLUMN songs.deleted_at IS 'Soft delete timestamp (null = active)';
