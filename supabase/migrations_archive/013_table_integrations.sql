-- ============================================================================
-- Migration 013: Integration Tables
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- API keys, OAuth integrations, and webhooks

-- ============================================================================
-- API KEYS
-- ============================================================================
-- Bearer token authentication for external API access

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner (references auth.users directly since it's for API auth)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Key details
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 hash
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX ix_api_keys_user ON api_keys(user_id);
CREATE INDEX ix_api_keys_hash ON api_keys(key_hash);
CREATE INDEX ix_api_keys_active ON api_keys(user_id, is_active) WHERE is_active = true;

-- Trigger
CREATE TRIGGER tr_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Comments
COMMENT ON TABLE api_keys IS 'Bearer token API keys for external API authentication';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the API key (actual key never stored)';
COMMENT ON COLUMN api_keys.last_used_at IS 'Last successful authentication with this key';

-- ============================================================================
-- USER INTEGRATIONS (OAuth)
-- ============================================================================
-- OAuth tokens for external services (Google Calendar, etc.)

CREATE TABLE user_integrations (
    -- Composite primary key
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,

    -- OAuth tokens
    access_token TEXT,
    refresh_token TEXT,
    expires_at BIGINT,  -- Unix timestamp in milliseconds

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (user_id, provider)
);

-- Index for user lookups
CREATE INDEX ix_user_integrations_user ON user_integrations(user_id);

-- Trigger
CREATE TRIGGER tr_user_integrations_updated_at
    BEFORE UPDATE ON user_integrations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Comments
COMMENT ON TABLE user_integrations IS 'OAuth tokens for external service integrations';
COMMENT ON COLUMN user_integrations.provider IS 'Provider name (e.g., google, spotify)';
COMMENT ON COLUMN user_integrations.expires_at IS 'Token expiration in Unix milliseconds';

-- ============================================================================
-- WEBHOOK SUBSCRIPTIONS
-- ============================================================================
-- External webhook subscriptions (Google Calendar push notifications)

CREATE TABLE webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Owner
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Subscription details
    provider VARCHAR(50) NOT NULL,
    channel_id VARCHAR(255) NOT NULL UNIQUE,
    resource_id VARCHAR(255) NOT NULL,
    expiration BIGINT NOT NULL,  -- Unix timestamp in milliseconds

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX ix_webhook_subscriptions_user ON webhook_subscriptions(user_id);
CREATE INDEX ix_webhook_subscriptions_expiration ON webhook_subscriptions(expiration);

-- Trigger
CREATE TRIGGER tr_webhook_subscriptions_updated_at
    BEFORE UPDATE ON webhook_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Comments
COMMENT ON TABLE webhook_subscriptions IS 'External webhook subscriptions for push notifications';
COMMENT ON COLUMN webhook_subscriptions.channel_id IS 'Unique channel ID for receiving callbacks';
COMMENT ON COLUMN webhook_subscriptions.resource_id IS 'External resource ID being watched';
COMMENT ON COLUMN webhook_subscriptions.expiration IS 'Subscription expiration in Unix milliseconds';
