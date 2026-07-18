-- Migration: RLS policies for songs table
-- Teachers and admins can manage songs; students can select

-- Helper function to check if current user is teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_teacher FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- Helper function to check if current user is student
CREATE OR REPLACE FUNCTION public.is_student()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_student FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

CREATE POLICY select_songs_all_roles ON songs
  FOR SELECT USING (
    public.is_admin() OR public.is_teacher() OR public.is_student()
  );

CREATE POLICY insert_songs_admin ON songs
  FOR INSERT WITH CHECK (
    public.is_admin() OR public.is_teacher()
  );

CREATE POLICY update_songs_admin ON songs
  FOR UPDATE USING (
    public.is_admin() OR public.is_teacher()
  );

CREATE POLICY delete_songs_admin ON songs
  FOR DELETE USING (
    public.is_admin() OR public.is_teacher()
  );
