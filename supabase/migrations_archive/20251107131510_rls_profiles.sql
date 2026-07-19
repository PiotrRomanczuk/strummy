-- Migration: RLS policies for profiles table
-- Only allow users to access their own profile, or admins

-- Helper function to check if current user is admin (security definer to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Allow users to select their own profile, or if they are admin
CREATE POLICY select_own_or_admin_profile ON profiles
  FOR SELECT USING (
    id = auth.uid() OR public.is_admin()
  );

-- Allow users to update their own profile, or if they are admin
CREATE POLICY update_own_or_admin_profile ON profiles
  FOR UPDATE USING (
    id = auth.uid() OR public.is_admin()
  );

-- Allow users to delete their own profile, or if they are admin
CREATE POLICY delete_own_or_admin_profile ON profiles
  FOR DELETE USING (
    id = auth.uid() OR public.is_admin()
  );

-- Only admins can insert new profiles
CREATE POLICY insert_profile_admin_only ON profiles
  FOR INSERT WITH CHECK (
    public.is_admin()
  );
