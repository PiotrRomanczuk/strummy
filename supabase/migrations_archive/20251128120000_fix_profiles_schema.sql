-- Add user_id to profiles table to link with auth.users
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Re-create the function to ensure it's valid with the new column
CREATE OR REPLACE FUNCTION link_shadow_profile()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET user_id = NEW.id,
      updated_at = NOW()
  WHERE email = NEW.email
    AND user_id IS NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
