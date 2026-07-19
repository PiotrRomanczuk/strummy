-- ============================================================================
-- Migration 040: Add Priority Check Constraint to in_app_notifications
-- Guitar CRM - Enforce priority range (1-10)
-- ============================================================================
-- This migration adds a check constraint to ensure priority values are
-- within the valid range (1-10) as defined in the TypeScript interface.
--
-- Note: The main in_app_notifications table was created in migration 038.
-- This migration only adds the missing constraint.

-- ============================================================================
-- CHECK CONSTRAINT: Priority must be between 1 and 10
-- ============================================================================

ALTER TABLE in_app_notifications
  ADD CONSTRAINT ck_in_app_notifications_priority_range
  CHECK (priority >= 1 AND priority <= 10);

COMMENT ON CONSTRAINT ck_in_app_notifications_priority_range
  ON in_app_notifications IS 'Enforce priority range: 1 (lowest) to 10 (highest)';

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Test constraint enforcement:
-- INSERT INTO in_app_notifications (user_id, notification_type, title, body, priority)
-- VALUES (auth.uid(), 'lesson_reminder_24h', 'Test', 'Test', 0);
-- Expected: ERROR - violates check constraint

-- INSERT INTO in_app_notifications (user_id, notification_type, title, body, priority)
-- VALUES (auth.uid(), 'lesson_reminder_24h', 'Test', 'Test', 11);
-- Expected: ERROR - violates check constraint

-- INSERT INTO in_app_notifications (user_id, notification_type, title, body, priority)
-- VALUES (auth.uid(), 'lesson_reminder_24h', 'Test', 'Test', 5);
-- Expected: SUCCESS

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- ✓ Added check constraint for priority (1-10)
-- ✓ Documented constraint purpose
-- ✓ Included test queries for validation
