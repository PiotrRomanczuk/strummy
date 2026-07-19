-- ============================================================================
-- Migration 035: Email Rate Limit Functions
-- Uses notification_log table to enforce rate limits on email sending
-- ============================================================================

-- Per-user email count in the last hour
CREATE OR REPLACE FUNCTION get_user_email_count_last_hour(p_user_id UUID)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COUNT(*)::INTEGER FROM notification_log
  WHERE recipient_user_id = p_user_id
    AND status IN ('sent', 'pending')
    AND created_at > now() - interval '1 hour';
$$;

-- System-wide email count in the last hour
CREATE OR REPLACE FUNCTION get_system_email_count_last_hour()
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COUNT(*)::INTEGER FROM notification_log
  WHERE status IN ('sent', 'pending')
    AND created_at > now() - interval '1 hour';
$$;

-- Partial index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS ix_notification_log_rate_limit
  ON notification_log(created_at DESC)
  WHERE status IN ('sent', 'pending');

COMMENT ON FUNCTION get_user_email_count_last_hour IS 'Count emails sent by a user in the last hour for rate limiting';
COMMENT ON FUNCTION get_system_email_count_last_hour IS 'Count all emails sent in the last hour for system-wide rate limiting';
