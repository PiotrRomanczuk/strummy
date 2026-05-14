-- Rate limit table for cross-instance consistency on Vercel Fluid Compute
CREATE TABLE IF NOT EXISTS ai_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at TIMESTAMPTZ NOT NULL
);

-- Auto-purge expired entries
CREATE INDEX IF NOT EXISTS ix_ai_rate_limits_reset ON ai_rate_limits(reset_at);

-- Atomic increment function with window expiry reset
CREATE OR REPLACE FUNCTION increment_rate_limit(p_key TEXT, p_window_ms INTEGER)
RETURNS TABLE(count INTEGER, reset_at TIMESTAMPTZ)
LANGUAGE plpgsql
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_reset_at TIMESTAMPTZ := v_now + (p_window_ms || ' milliseconds')::INTERVAL;
  v_count INTEGER;
  v_stored_reset TIMESTAMPTZ;
BEGIN
  -- Get existing entry
  SELECT al.count, al.reset_at INTO v_count, v_stored_reset
  FROM ai_rate_limits al WHERE al.key = p_key FOR UPDATE;

  IF NOT FOUND OR v_stored_reset < v_now THEN
    -- New window or expired
    INSERT INTO ai_rate_limits (key, count, reset_at)
    VALUES (p_key, 1, v_reset_at)
    ON CONFLICT (key) DO UPDATE SET count = 1, reset_at = v_reset_at;
    RETURN QUERY SELECT 1::INTEGER, v_reset_at;
  ELSE
    -- Increment existing
    UPDATE ai_rate_limits SET count = ai_rate_limits.count + 1 WHERE ai_rate_limits.key = p_key;
    RETURN QUERY SELECT v_count + 1, v_stored_reset;
  END IF;
END;
$$;

-- RLS: rate limit table is only accessible server-side (service role)
ALTER TABLE ai_rate_limits ENABLE ROW LEVEL SECURITY;
-- No policies = service role only access
