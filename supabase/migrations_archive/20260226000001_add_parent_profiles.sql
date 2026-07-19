-- Migration: Add parent profile support to profiles table
-- A student profile can reference a parent/guardian profile via parent_id.
-- Multiple students can reference the same parent (many-to-one).

ALTER TABLE profiles ADD COLUMN parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN is_parent BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX ix_profiles_parent_id ON profiles(parent_id);
CREATE INDEX ix_profiles_is_parent ON profiles(is_parent) WHERE is_parent = true;

COMMENT ON COLUMN profiles.parent_id IS 'For student profiles: references the parent/guardian profile';
COMMENT ON COLUMN profiles.is_parent IS 'This profile belongs to a parent/guardian of a student';
