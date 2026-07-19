-- ============================================================================
-- Migration 032: Notification System
-- Guitar CRM - Email Notification Infrastructure
-- ============================================================================
-- Creates tables and enums for comprehensive email notification system
-- with user preferences, logging, queuing, and retry logic

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Notification types for all email categories
CREATE TYPE notification_type AS ENUM (
    -- Lesson notifications
    'lesson_reminder_24h',
    'lesson_recap',
    'lesson_cancelled',
    'lesson_rescheduled',

    -- Assignment notifications
    'assignment_created',
    'assignment_due_reminder',
    'assignment_overdue_alert',
    'assignment_completed',

    -- Achievement notifications
    'song_mastery_achievement',
    'milestone_reached',

    -- Student lifecycle
    'student_welcome',
    'trial_ending_reminder',

    -- Digest notifications
    'teacher_daily_summary',
    'weekly_progress_digest',

    -- System notifications
    'calendar_conflict_alert',
    'webhook_expiration_notice',
    'admin_error_alert'
);

-- Notification delivery status
CREATE TYPE notification_status AS ENUM (
    'pending',      -- Queued, not yet sent
    'sent',         -- Successfully delivered
    'failed',       -- Delivery failed, will retry
    'bounced',      -- Email bounced, user email invalid
    'skipped',      -- Skipped due to user preference
    'cancelled'     -- Cancelled before sending
);

-- ============================================================================
-- TABLE: notification_preferences
-- ============================================================================
-- User-level opt-in/opt-out settings for each notification type

CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who this preference belongs to
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Which notification type
    notification_type notification_type NOT NULL,

    -- Is this notification enabled for this user?
    enabled BOOLEAN NOT NULL DEFAULT true,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Ensure one preference per user per type
    UNIQUE(user_id, notification_type)
);

-- ============================================================================
-- TABLE: notification_log
-- ============================================================================
-- Audit trail for all notification attempts

CREATE TABLE notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Notification details
    notification_type notification_type NOT NULL,
    recipient_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,

    -- Status tracking
    status notification_status NOT NULL DEFAULT 'pending',

    -- Content
    subject TEXT NOT NULL,
    template_data JSONB,

    -- Delivery tracking
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 5,

    -- Related entity (optional polymorphic reference)
    entity_type TEXT,  -- 'lesson', 'assignment', 'song', etc.
    entity_id UUID,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TABLE: notification_queue
-- ============================================================================
-- Queue for scheduled/delayed notifications

CREATE TABLE notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Notification details
    notification_type notification_type NOT NULL,
    recipient_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Template data
    template_data JSONB NOT NULL,

    -- Scheduling
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,

    -- Status
    status notification_status NOT NULL DEFAULT 'pending',

    -- Priority (higher = process first)
    priority INT NOT NULL DEFAULT 5,

    -- Related entity (optional)
    entity_type TEXT,
    entity_id UUID,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- notification_preferences indexes
CREATE INDEX ix_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX ix_notification_preferences_type ON notification_preferences(notification_type);
CREATE INDEX ix_notification_preferences_enabled ON notification_preferences(user_id, enabled) WHERE enabled = true;

-- notification_log indexes
CREATE INDEX ix_notification_log_user ON notification_log(recipient_user_id, created_at DESC);
CREATE INDEX ix_notification_log_type ON notification_log(notification_type, created_at DESC);
CREATE INDEX ix_notification_log_status ON notification_log(status, created_at DESC);
CREATE INDEX ix_notification_log_entity ON notification_log(entity_type, entity_id) WHERE entity_type IS NOT NULL;
CREATE INDEX ix_notification_log_retry ON notification_log(status, retry_count) WHERE status = 'failed';

-- notification_queue indexes
CREATE INDEX ix_notification_queue_scheduled ON notification_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX ix_notification_queue_user ON notification_queue(recipient_user_id);
CREATE INDEX ix_notification_queue_priority ON notification_queue(priority DESC, scheduled_for ASC) WHERE status = 'pending';
CREATE INDEX ix_notification_queue_status ON notification_queue(status);

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_notification_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_notification_preferences_updated
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_timestamp();

CREATE TRIGGER tr_notification_log_updated
    BEFORE UPDATE ON notification_log
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_timestamp();

CREATE TRIGGER tr_notification_queue_updated
    BEFORE UPDATE ON notification_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_timestamp();

-- ============================================================================
-- FUNCTION: Initialize default preferences for new users
-- ============================================================================

CREATE OR REPLACE FUNCTION initialize_notification_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_types TEXT[] := ARRAY[
        'lesson_reminder_24h',
        'lesson_recap',
        'lesson_cancelled',
        'lesson_rescheduled',
        'assignment_created',
        'assignment_due_reminder',
        'assignment_overdue_alert',
        'assignment_completed',
        'song_mastery_achievement',
        'milestone_reached',
        'student_welcome',
        'trial_ending_reminder',
        'teacher_daily_summary',
        'weekly_progress_digest',
        'calendar_conflict_alert',
        'webhook_expiration_notice',
        'admin_error_alert'
    ];
    notification_type_val TEXT;
BEGIN
    -- Create default preferences for all notification types
    FOREACH notification_type_val IN ARRAY notification_types
    LOOP
        INSERT INTO notification_preferences (user_id, notification_type, enabled)
        VALUES (
            NEW.id,
            notification_type_val::notification_type,
            CASE
                -- Opt-in by default for most notifications
                WHEN notification_type_val IN ('weekly_progress_digest', 'teacher_daily_summary') THEN false
                ELSE true
            END
        )
        ON CONFLICT (user_id, notification_type) DO NOTHING;
    END LOOP;

    RETURN NEW;
END;
$$;

-- Trigger to initialize preferences when new user is created
CREATE TRIGGER tr_initialize_notification_preferences
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION initialize_notification_preferences();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- notification_preferences policies
-- Users can view and update their own preferences
CREATE POLICY notification_preferences_select_own
    ON notification_preferences FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY notification_preferences_update_own
    ON notification_preferences FOR UPDATE
    USING (user_id = auth.uid());

-- Admins can view all preferences
CREATE POLICY notification_preferences_select_admin
    ON notification_preferences FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- notification_log policies
-- Users can view their own notification logs
CREATE POLICY notification_log_select_own
    ON notification_log FOR SELECT
    USING (recipient_user_id = auth.uid());

-- Admins can view all logs
CREATE POLICY notification_log_select_admin
    ON notification_log FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Service role can insert/update (for system operations)
CREATE POLICY notification_log_service_all
    ON notification_log FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- notification_queue policies
-- Users can view their own queued notifications
CREATE POLICY notification_queue_select_own
    ON notification_queue FOR SELECT
    USING (recipient_user_id = auth.uid());

-- Admins can view all queued notifications
CREATE POLICY notification_queue_select_admin
    ON notification_queue FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Service role can manage queue (for cron jobs)
CREATE POLICY notification_queue_service_all
    ON notification_queue FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- HELPER FUNCTION: Check if user has notification enabled
-- ============================================================================

CREATE OR REPLACE FUNCTION is_notification_enabled(
    p_user_id UUID,
    p_notification_type notification_type
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    preference_enabled BOOLEAN;
BEGIN
    SELECT enabled INTO preference_enabled
    FROM notification_preferences
    WHERE user_id = p_user_id
      AND notification_type = p_notification_type;

    -- If no preference found, default to enabled
    RETURN COALESCE(preference_enabled, true);
END;
$$;

-- ============================================================================
-- HELPER FUNCTION: Get pending notifications for processing
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_notifications(batch_size INT DEFAULT 100)
RETURNS TABLE (
    id UUID,
    notification_type notification_type,
    recipient_user_id UUID,
    recipient_email TEXT,
    template_data JSONB,
    scheduled_for TIMESTAMPTZ,
    priority INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        nq.id,
        nq.notification_type,
        nq.recipient_user_id,
        p.email,
        nq.template_data,
        nq.scheduled_for,
        nq.priority
    FROM notification_queue nq
    JOIN profiles p ON p.id = nq.recipient_user_id
    WHERE nq.status = 'pending'
      AND nq.scheduled_for <= now()
    ORDER BY nq.priority DESC, nq.scheduled_for ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED;  -- Prevent concurrent processing
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TYPE notification_type IS 'All available email notification types';
COMMENT ON TYPE notification_status IS 'Notification delivery status tracking';

COMMENT ON TABLE notification_preferences IS 'User-level notification opt-in/opt-out settings';
COMMENT ON TABLE notification_log IS 'Audit trail for all notification delivery attempts';
COMMENT ON TABLE notification_queue IS 'Queue for scheduled and delayed notifications';

COMMENT ON COLUMN notification_log.retry_count IS 'Number of retry attempts (max 5 with exponential backoff)';
COMMENT ON COLUMN notification_queue.priority IS 'Higher priority notifications processed first (1-10, default 5)';
COMMENT ON COLUMN notification_queue.scheduled_for IS 'When to send this notification (allows scheduling future notifications)';

COMMENT ON FUNCTION is_notification_enabled IS 'Check if user has enabled a specific notification type';
COMMENT ON FUNCTION get_pending_notifications IS 'Get batch of pending notifications ready for processing with row locking';
