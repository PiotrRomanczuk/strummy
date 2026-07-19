-- ============================================================================
-- Migration 001: Extensions
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Enable required PostgreSQL extensions

-- Trigram extension for fuzzy text search (LIKE/ILIKE optimization)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- UUID generation (built-in gen_random_uuid() preferred, but this is backup)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Comments
COMMENT ON EXTENSION pg_trgm IS 'Trigram matching for fuzzy text search on song titles and authors';
