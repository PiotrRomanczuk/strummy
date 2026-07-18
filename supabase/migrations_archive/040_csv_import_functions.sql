-- ============================================================================
-- Migration 040: CSV Import - Fuzzy Song Matching Function
-- Uses pg_trgm similarity() with existing GIN trigram indexes
-- ============================================================================

CREATE OR REPLACE FUNCTION find_similar_songs(
    search_title TEXT,
    threshold FLOAT DEFAULT 0.3,
    max_results INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    title VARCHAR(500),
    author VARCHAR(500),
    similarity FLOAT
)
LANGUAGE sql
STABLE
AS $$
    SELECT s.id, s.title, s.author, similarity(s.title, search_title) AS similarity
    FROM songs s
    WHERE s.deleted_at IS NULL
      AND similarity(s.title, search_title) >= threshold
    ORDER BY similarity(s.title, search_title) DESC
    LIMIT max_results;
$$;

COMMENT ON FUNCTION find_similar_songs IS 'Finds songs with similar titles using trigram matching for CSV import';
