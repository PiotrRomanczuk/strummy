-- ============================================================================
-- Migration 004: Base Utility Functions
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Generic utility functions with no table dependencies

-- ============================================================================
-- TIMESTAMP MANAGEMENT
-- ============================================================================

-- Generic updated_at trigger function (used by all tables with updated_at)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION set_updated_at() IS 'Generic trigger function to auto-update updated_at timestamp';
