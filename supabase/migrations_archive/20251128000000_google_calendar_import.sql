-- Add google_event_id to lessons table
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS google_event_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_lessons_google_event_id ON lessons(google_event_id);

-- Function to link new auth users to existing shadow profiles
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

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION link_shadow_profile();

-- Allow teachers to read/create shadow student profiles
-- Note: We need to check if policies already exist to avoid errors, or drop and recreate.
-- Since "create policy if not exists" isn't standard SQL in all versions, we'll drop if exists.

DROP POLICY IF EXISTS "Teachers can create student profiles" ON profiles;
CREATE POLICY "Teachers can create student profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'teacher'
  )
);

DROP POLICY IF EXISTS "Teachers can read all profiles" ON profiles;
CREATE POLICY "Teachers can read all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('teacher', 'admin')
  )
);
