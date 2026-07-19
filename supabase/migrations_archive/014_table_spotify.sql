-- ============================================================================
-- Migration 014: Spotify Matches Table
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Stores potential Spotify matches for manual review

CREATE TABLE spotify_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Related song
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,

    -- Spotify track data (no redundant spotify_ prefix)
    track_id VARCHAR(255) NOT NULL,
    track_name VARCHAR(500) NOT NULL,
    artist_name VARCHAR(500) NOT NULL,
    album_name VARCHAR(500),
    url url NOT NULL,
    preview_url url,
    cover_image_url url,
    duration_ms positive_int,
    release_date VARCHAR(50),
    popularity SMALLINT CHECK (popularity IS NULL OR (popularity >= 0 AND popularity <= 100)),

    -- Matching metadata
    confidence_score percentage NOT NULL,
    search_query TEXT NOT NULL,
    match_reason medium_text,
    ai_reasoning medium_text,

    -- Review status
    status spotify_match_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_notes medium_text,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique pending match per song+track combination
    CONSTRAINT uq_spotify_matches UNIQUE (song_id, track_id, status) DEFERRABLE INITIALLY DEFERRED
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX ix_spotify_matches_song ON spotify_matches(song_id);
CREATE INDEX ix_spotify_matches_status ON spotify_matches(status);
CREATE INDEX ix_spotify_matches_status_confidence ON spotify_matches(status, confidence_score DESC);
CREATE INDEX ix_spotify_matches_pending ON spotify_matches(created_at DESC) WHERE status = 'pending';

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER tr_spotify_matches_updated_at
    BEFORE UPDATE ON spotify_matches
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE spotify_matches IS 'Potential Spotify matches awaiting review';
COMMENT ON COLUMN spotify_matches.confidence_score IS 'AI confidence score (0-100)';
COMMENT ON COLUMN spotify_matches.status IS 'Review status: pending, approved, rejected, auto_applied';
COMMENT ON COLUMN spotify_matches.match_reason IS 'Brief explanation of why this was considered a match';
COMMENT ON COLUMN spotify_matches.ai_reasoning IS 'Detailed AI reasoning for the match';
