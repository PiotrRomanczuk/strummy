-- Migration: Sync profile roles to user_roles
-- Date: 2025-12-03
-- Purpose: Ensure user_roles table is kept in sync with profiles table boolean flags
-- This fixes RLS issues where users have flags in profiles but missing entries in user_roles

-- Function to sync profile roles to user_roles
CREATE OR REPLACE FUNCTION public.sync_profile_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle Admin
  IF NEW.is_admin = true THEN
    INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM user_roles WHERE user_id = NEW.id AND role = 'admin';
  END IF;

  -- Handle Teacher
  IF NEW.is_teacher = true THEN
    INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'teacher')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM user_roles WHERE user_id = NEW.id AND role = 'teacher';
  END IF;

  -- Handle Student
  IF NEW.is_student = true THEN
    INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM user_roles WHERE user_id = NEW.id AND role = 'student';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on profiles update/insert
DROP TRIGGER IF EXISTS trigger_sync_profile_roles ON profiles;
CREATE TRIGGER trigger_sync_profile_roles
AFTER INSERT OR UPDATE OF is_admin, is_teacher, is_student ON profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_roles();

-- Run sync for existing profiles to fix current state
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::user_role FROM profiles WHERE is_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT id, 'teacher'::user_role FROM profiles WHERE is_teacher = true
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT id, 'student'::user_role FROM profiles WHERE is_student = true
ON CONFLICT (user_id, role) DO NOTHING;
