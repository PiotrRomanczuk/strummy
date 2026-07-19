-- ============================================================================
-- Migration 002: Custom Domains
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Define reusable data types for consistency

-- Bounded text types to prevent unbounded storage
CREATE DOMAIN short_text AS VARCHAR(500);
CREATE DOMAIN medium_text AS VARCHAR(5000);
CREATE DOMAIN long_text AS VARCHAR(50000);

-- Email with basic validation
CREATE DOMAIN email_address AS TEXT
    CHECK (VALUE ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- URL type with basic validation
CREATE DOMAIN url AS TEXT
    CHECK (VALUE IS NULL OR VALUE ~* '^https?://');

-- Positive integer for counts
CREATE DOMAIN positive_int AS INTEGER
    CHECK (VALUE IS NULL OR VALUE > 0);

-- Percentage (0-100)
CREATE DOMAIN percentage AS INTEGER
    CHECK (VALUE IS NULL OR (VALUE >= 0 AND VALUE <= 100));

-- Comments
COMMENT ON DOMAIN short_text IS 'Text limited to 500 characters - for titles, names';
COMMENT ON DOMAIN medium_text IS 'Text limited to 5000 characters - for descriptions, notes';
COMMENT ON DOMAIN long_text IS 'Text limited to 50000 characters - for long content';
COMMENT ON DOMAIN email_address IS 'Email address with basic format validation';
COMMENT ON DOMAIN url IS 'URL with http/https protocol validation';
COMMENT ON DOMAIN positive_int IS 'Positive integer for counts and durations';
COMMENT ON DOMAIN percentage IS 'Integer between 0 and 100';
