-- ============================================================================
-- Migration 038: In-App Notifications System
-- Guitar CRM - Convert 90% of Email Notifications to In-App Only
-- ============================================================================
-- Creates in-app notification infrastructure to reduce email fatigue
-- and provide immediate, contextual notifications within the app

-- ============================================================================
-- ENUM: Notification Delivery Channels
-- ============================================================================

CREATE TYPE notification_delivery_channel AS ENUM (
  'email',    -- Email only (student_welcome, lesson_recap)
  'in_app',   -- In-app only (90% of notifications)
  'both'      -- Both channels (future use)
);

COMMENT ON TYPE notification_delivery_channel IS 'Delivery channel for notifications: email, in-app, or both';

-- ============================================================================
-- TABLE: in_app_notifications
-- ============================================================================
-- Stores in-app notifications for users with real-time updates

CREATE TABLE in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Recipient
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Notification details
    notification_type notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,

    -- Visual styling
    icon TEXT,  -- emoji or lucide icon name (e.g., '📅' or 'Calendar')
    variant TEXT DEFAULT 'default',  -- 'default' | 'success' | 'warning' | 'error' | 'info'

    -- Read status
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,

    -- Action (optional CTA)
    action_url TEXT,
    action_label TEXT,

    -- Entity reference (polymorphic)
    entity_type TEXT,  -- 'lesson', 'assignment', 'song', etc.
    entity_id TEXT,

    -- Priority (1-10, higher = more important)
    priority INT NOT NULL DEFAULT 5,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

COMMENT ON TABLE in_app_notifications IS 'In-app notifications shown in notification bell and center';
COMMENT ON COLUMN in_app_notifications.variant IS 'Visual variant: default, success, warning, error, info';
COMMENT ON COLUMN in_app_notifications.entity_type IS 'Polymorphic reference: lesson, assignment, song, etc.';
COMMENT ON COLUMN in_app_notifications.expires_at IS 'Auto-cleanup after 30 days for read notifications';

-- ============================================================================
-- INDEXES: in_app_notifications
-- ============================================================================

-- Unread notifications query (most common)
CREATE INDEX ix_in_app_notifications_user_unread
  ON in_app_notifications(user_id, created_at DESC)
  WHERE is_read = false;

-- All notifications for user (notification center page)
CREATE INDEX ix_in_app_notifications_user_all
  ON in_app_notifications(user_id, created_at DESC);

-- Entity lookup (find notifications for specific lesson/assignment)
CREATE INDEX ix_in_app_notifications_entity
  ON in_app_notifications(entity_type, entity_id)
  WHERE entity_type IS NOT NULL;

-- Cleanup query (expired read notifications)
CREATE INDEX ix_in_app_notifications_expires
  ON in_app_notifications(expires_at)
  WHERE is_read = true;

-- ============================================================================
-- RLS POLICIES: in_app_notifications
-- ============================================================================

ALTER TABLE in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY in_app_notifications_select_own
  ON in_app_notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY in_app_notifications_update_own
  ON in_app_notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Service role can insert notifications
CREATE POLICY in_app_notifications_service_insert
  ON in_app_notifications FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Admins can do everything
CREATE POLICY in_app_notifications_admin_all
  ON in_app_notifications FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================

CREATE TRIGGER tr_in_app_notifications_updated_at
  BEFORE UPDATE ON in_app_notifications
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- ADD COLUMN: notification_preferences.delivery_channel
-- ============================================================================
-- Determines whether notification is sent via email, in-app, or both

ALTER TABLE notification_preferences
  ADD COLUMN delivery_channel notification_delivery_channel NOT NULL DEFAULT 'email';

COMMENT ON COLUMN notification_preferences.delivery_channel IS 'Delivery channel: email (2 types), in_app (16 types), or both (future)';

-- ============================================================================
-- SET DEFAULTS: Delivery channels by notification type
-- ============================================================================

-- Email-only notifications (2 types: student_welcome, lesson_recap)
UPDATE notification_preferences
SET delivery_channel = 'email'
WHERE notification_type IN ('student_welcome', 'lesson_recap');

-- In-app only notifications (16 types: all others)
UPDATE notification_preferences
SET delivery_channel = 'in_app'
WHERE notification_type NOT IN ('student_welcome', 'lesson_recap');

-- ============================================================================
-- FUNCTION: Cleanup old read in-app notifications
-- ============================================================================
-- Deletes read notifications older than expires_at (default 30 days)
-- Run daily via cron job

CREATE OR REPLACE FUNCTION cleanup_old_in_app_notifications()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM in_app_notifications
  WHERE is_read = true AND expires_at < now();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RAISE NOTICE 'Deleted % old read in-app notifications', deleted_count;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_in_app_notifications IS 'Delete read notifications past expiration (run daily via cron)';

-- ============================================================================
-- REALTIME: Enable for in_app_notifications
-- ============================================================================
-- Allows real-time subscription to new notifications in UI

ALTER PUBLICATION supabase_realtime ADD TABLE in_app_notifications;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TYPE notification_delivery_channel IS 'Notification delivery channel: email (2 types), in_app (16 types), or both (future)';
