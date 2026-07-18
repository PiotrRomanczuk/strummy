-- ============================================================================
-- Migration 029: Add is_shadow column to profiles
-- Supports shadow/placeholder users created during lesson import
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_shadow BOOLEAN NOT NULL DEFAULT false;

-- Index for filtering shadow users
CREATE INDEX IF NOT EXISTS ix_profiles_is_shadow ON profiles(is_shadow) WHERE is_shadow = true;

COMMENT ON COLUMN profiles.is_shadow IS 'Shadow/placeholder user created during import, not a real authenticated user';
