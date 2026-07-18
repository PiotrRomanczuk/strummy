-- ============================================================================
-- Migration: Atomic Rate Limit Function
-- Replaces the two-step check-then-insert with a single atomic operation
-- to prevent race conditions where concurrent requests bypass limits.
-- ============================================================================

CREATE OR REPLACE FUNCTION check_and_record_auth_rate_limit(
  p_identifier TEXT,
  p_operation TEXT,
  p_window_ms BIGINT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Step 1: Insert the attempt first (atomic)
  INSERT INTO auth_rate_limits (identifier, operation, attempted_at)
  VALUES (p_identifier, p_operation, now());

  -- Step 2: Count all attempts in the window (including the one just inserted)
  SELECT COUNT(*)::INTEGER INTO v_count
  FROM auth_rate_limits
  WHERE identifier = p_identifier
    AND operation = p_operation
    AND attempted_at > now() - (p_window_ms || ' milliseconds')::interval;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION check_and_record_auth_rate_limit IS 'Atomically record an auth attempt and return the count in the window. Prevents race conditions in rate limiting.';
