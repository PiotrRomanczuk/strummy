-- Fix infinite recursion by breaking circular dependencies
-- 1. Create helper to check roles without triggering RLS
CREATE OR REPLACE FUNCTION public.has_role(_role public.user_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = _role
  );
$$;

-- 2. Update is_admin to use user_roles instead of profiles
-- This breaks the profiles -> is_admin -> profiles loop
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- 3. Update profiles policies to use the safe functions
DROP POLICY IF EXISTS "Teachers can create student profiles" ON profiles;
CREATE POLICY "Teachers can create student profiles"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role('teacher')
);

DROP POLICY IF EXISTS "Teachers can read all profiles" ON profiles;
CREATE POLICY "Teachers can read all profiles"
ON profiles FOR SELECT
TO authenticated
USING (
  public.has_role('teacher') OR public.is_admin()
);

-- Update existing policies that might use direct queries
DROP POLICY IF EXISTS select_own_or_admin_profile ON profiles;
CREATE POLICY select_own_or_admin_profile ON profiles
  FOR SELECT USING (
    id = auth.uid() OR public.is_admin()
  );

DROP POLICY IF EXISTS update_own_or_admin_profile ON profiles;
CREATE POLICY update_own_or_admin_profile ON profiles
  FOR UPDATE USING (
    id = auth.uid() OR public.is_admin()
  );

DROP POLICY IF EXISTS delete_own_or_admin_profile ON profiles;
CREATE POLICY delete_own_or_admin_profile ON profiles
  FOR DELETE USING (
    id = auth.uid() OR public.is_admin()
  );
