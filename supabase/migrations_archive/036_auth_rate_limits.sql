-- ============================================================================
-- Migration 036: Auth Rate Limits
-- Supabase-backed rate limiting for auth operations (login, signup, password reset)
-- Replaces in-memory Map that doesn't persist across Vercel serverless invocations
-- ============================================================================

CREATE TABLE auth_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  operation TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_auth_rate_limits_lookup
  ON auth_rate_limits(identifier, operation, attempted_at DESC);

ALTER TABLE auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service_role can access this table
CREATE POLICY auth_rate_limits_service_only ON auth_rate_limits
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Count attempts in a time window
CREATE OR REPLACE FUNCTION check_auth_rate_limit(
  p_identifier TEXT, p_operation TEXT, p_window_ms BIGINT
) RETURNS INTEGER LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COUNT(*)::INTEGER FROM auth_rate_limits
  WHERE identifier = p_identifier AND operation = p_operation
    AND attempted_at > now() - (p_window_ms || ' milliseconds')::interval;
$$;

-- Cleanup entries older than 2 hours
CREATE OR REPLACE FUNCTION cleanup_auth_rate_limits()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM auth_rate_limits WHERE attempted_at < now() - interval '2 hours';
$$;

COMMENT ON TABLE auth_rate_limits IS 'Tracks auth operation attempts for rate limiting';
COMMENT ON FUNCTION check_auth_rate_limit IS 'Count auth attempts in a time window for rate limiting';
COMMENT ON FUNCTION cleanup_auth_rate_limits IS 'Remove expired auth rate limit entries older than 2 hours';
