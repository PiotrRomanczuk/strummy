-- ============================================================================
-- Migration: Add API Key Expiration
-- Adds expires_at column to api_keys table for automatic key expiration.
-- Existing keys get NULL (no expiry) to avoid breaking changes.
-- ============================================================================

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

COMMENT ON COLUMN api_keys.expires_at IS 'When this key expires. NULL means no expiration.';
