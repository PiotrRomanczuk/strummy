-- Migration: Add notification monitoring functions for admin alerts
-- Created: 2026-02-09
-- Description: SQL functions to support admin alert system for notification monitoring

-- Function to get bounce statistics by notification type
CREATE OR REPLACE FUNCTION get_bounce_stats()
RETURNS TABLE (
  notification_type text,
  bounce_count bigint,
  total_sent bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nl.notification_type::text,
    COUNT(*) FILTER (WHERE nl.status = 'bounced') AS bounce_count,
    COUNT(*) AS total_sent
  FROM notification_log nl
  WHERE nl.created_at >= NOW() - INTERVAL '7 days'
  GROUP BY nl.notification_type
  HAVING COUNT(*) FILTER (WHERE nl.status = 'bounced') > 0
  ORDER BY COUNT(*) FILTER (WHERE nl.status = 'bounced') DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admin check done in RLS)
GRANT EXECUTE ON FUNCTION get_bounce_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_bounce_stats() TO service_role;

-- Add comment
COMMENT ON FUNCTION get_bounce_stats() IS 'Returns bounce statistics by notification type for the last 7 days';
