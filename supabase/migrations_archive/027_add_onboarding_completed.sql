-- ============================================================================
-- Migration 027: Add onboarding_completed column to profiles
-- ============================================================================
-- Adds a flag to track whether users have completed the onboarding flow

ALTER TABLE profiles
ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT false;

-- Add index for querying users who haven't completed onboarding
CREATE INDEX ix_profiles_onboarding_completed
ON profiles(onboarding_completed)
WHERE onboarding_completed = false AND is_student = true;

-- Comment
COMMENT ON COLUMN profiles.onboarding_completed IS 'Whether user has completed the onboarding flow';
