-- Auth Events Logging
-- Provides admin observability into signup, signin, invite, and password reset flows

-- Enum for event types
CREATE TYPE auth_event_type AS ENUM (
  'signup_attempted', 'signup_succeeded', 'signup_failed',
  'email_confirmed',
  'invite_sent', 'invite_failed',
  'user_created_by_admin', 'shadow_user_created',
  'signin_succeeded', 'signin_failed', 'signin_locked', 'signin_rate_limited',
  'password_reset_requested', 'password_reset_failed',
  'resend_verification_requested', 'resend_verification_failed'
);

-- Enum for email delivery status
CREATE TYPE auth_email_status AS ENUM ('not_applicable', 'sent', 'failed', 'skipped');

-- Main table
CREATE TABLE auth_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    auth_event_type NOT NULL,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_email    TEXT,
  user_id       UUID,
  actor_id      UUID,
  ip_address    TEXT,
  success       BOOLEAN NOT NULL,
  error_message TEXT,
  email_status  auth_email_status NOT NULL DEFAULT 'not_applicable',
  email_error   TEXT,
  metadata      JSONB
);

-- Indexes for common query patterns
CREATE INDEX idx_auth_events_occurred_at ON auth_events (occurred_at DESC);
CREATE INDEX idx_auth_events_user_email ON auth_events (user_email);
CREATE INDEX idx_auth_events_event_type ON auth_events (event_type);
CREATE INDEX idx_auth_events_success ON auth_events (success);

-- Enable RLS
ALTER TABLE auth_events ENABLE ROW LEVEL SECURITY;

-- Admin can read all events
CREATE POLICY "Admins can view auth events"
  ON auth_events FOR SELECT
  USING (is_admin());

-- No INSERT/UPDATE/DELETE policies for authenticated users
-- Writes happen via supabaseAdmin (service role bypasses RLS)
