-- Clean up full_name values that are just email local parts (not real names).
-- These were set by the shadow user creation code which used email.split('@')[0].
-- Setting them to NULL lets the UI correctly identify users without real names.
UPDATE profiles
SET full_name = NULL,
    updated_at = NOW()
WHERE full_name IS NOT NULL
  AND email IS NOT NULL
  AND full_name = split_part(email, '@', 1);
