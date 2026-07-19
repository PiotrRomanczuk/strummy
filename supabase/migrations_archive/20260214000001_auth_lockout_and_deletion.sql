-- Add columns for account lockout and deletion tracking
-- Part of auth registration improvements [STRUM-XXX]

-- Add failed login attempts tracking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;

-- Add account lockout timestamp
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- Add account deletion request timestamp
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;

-- Create index for faster lockout checks
CREATE INDEX IF NOT EXISTS idx_profiles_email_locked
ON profiles(email, locked_until)
WHERE locked_until IS NOT NULL;

-- Create index for deletion requests
CREATE INDEX IF NOT EXISTS idx_profiles_deletion_requested
ON profiles(deletion_requested_at)
WHERE deletion_requested_at IS NOT NULL;
