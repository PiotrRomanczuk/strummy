-- Fix infinite recursion in RLS policies

-- Redefine is_admin to be sure it is SECURITY DEFINER
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

-- Update user_roles policies to use is_admin() function instead of direct query
-- This breaks the recursion: user_roles -> profiles (RLS) -> user_roles
-- By using is_admin() (SECURITY DEFINER), we go: user_roles -> is_admin() -> profiles (NO RLS)

DROP POLICY IF EXISTS select_user_roles_admin ON user_roles;
CREATE POLICY select_user_roles_admin ON user_roles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS insert_user_roles_admin ON user_roles;
CREATE POLICY insert_user_roles_admin ON user_roles
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS update_user_roles_admin ON user_roles;
CREATE POLICY update_user_roles_admin ON user_roles
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS delete_user_roles_admin ON user_roles;
CREATE POLICY delete_user_roles_admin ON user_roles
  FOR DELETE USING (public.is_admin());

-- Allow users to read their own roles
-- This is required for the "Teachers can read all profiles" policy to work for teachers
-- (It checks if the user has 'teacher' role in user_roles)

DROP POLICY IF EXISTS select_own_roles ON user_roles;
CREATE POLICY select_own_roles ON user_roles
  FOR SELECT USING (user_id = auth.uid());
