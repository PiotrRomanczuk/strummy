-- Migration: Add parent constraints, helper function, and RLS policies
-- Addresses: self-linking prevention, is_parent() helper, parent read-only access

-- 1. Prevent self-linking (a user cannot be their own parent)
ALTER TABLE profiles ADD CONSTRAINT no_self_parent CHECK (parent_id != id);

-- 2. Helper function: is_parent() — mirrors is_admin(), is_teacher()
--    Uses SECURITY DEFINER to avoid RLS recursion on profiles.
CREATE OR REPLACE FUNCTION public.is_parent()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_parent = true
  );
$$;

-- 3. Helper: check if a student_id belongs to the current parent
--    SECURITY DEFINER bypasses RLS to avoid infinite recursion when
--    policies on other tables join back to profiles.
CREATE OR REPLACE FUNCTION public.is_child_of_parent(_student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = _student_id
      AND parent_id = auth.uid()
  );
$$;

-- 4. Parent RLS policies — read-only access to children's data

-- Parents can view their children's profiles
-- Uses is_parent() to avoid querying profiles inside its own RLS policy
CREATE POLICY profiles_select_parent ON profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_parent() AND profiles.parent_id = auth.uid()
  );

-- Parents can view their children's lessons (read-only)
CREATE POLICY lessons_select_parent ON lessons
  FOR SELECT
  TO authenticated
  USING (
    public.is_child_of_parent(lessons.student_id)
  );

-- Parents can view their children's assignments (read-only)
CREATE POLICY assignments_select_parent ON assignments
  FOR SELECT
  TO authenticated
  USING (
    public.is_child_of_parent(assignments.student_id)
  );

-- Parents can view their children's song progress (read-only)
CREATE POLICY student_song_progress_select_parent ON student_song_progress
  FOR SELECT
  TO authenticated
  USING (
    public.is_child_of_parent(student_song_progress.student_id)
  );

-- Parents can view their children's practice sessions (read-only)
CREATE POLICY practice_sessions_select_parent ON practice_sessions
  FOR SELECT
  TO authenticated
  USING (
    public.is_child_of_parent(practice_sessions.student_id)
  );

-- Parents can view songs assigned to their children via lessons
CREATE POLICY songs_select_parent ON songs
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM lesson_songs ls
      JOIN lessons l ON ls.lesson_id = l.id
      WHERE ls.song_id = songs.id
        AND public.is_child_of_parent(l.student_id)
        AND l.deleted_at IS NULL
    )
  );
