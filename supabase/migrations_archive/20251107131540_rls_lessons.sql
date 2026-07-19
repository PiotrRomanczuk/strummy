-- Migration: RLS policies for lessons table
-- Teachers, students, and admins can access their lessons


CREATE POLICY select_lessons_participants ON lessons
  FOR SELECT USING (
    public.is_admin()
    OR teacher_id = auth.uid()
    OR student_id = auth.uid()
  );

CREATE POLICY insert_lessons_admin ON lessons
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR teacher_id = auth.uid()
  );

CREATE POLICY update_lessons_admin ON lessons
  FOR UPDATE USING (
    public.is_admin()
    OR teacher_id = auth.uid()
    OR student_id = auth.uid()
  );

CREATE POLICY delete_lessons_admin ON lessons
  FOR DELETE USING (
    public.is_admin()
    OR teacher_id = auth.uid()
    OR student_id = auth.uid()
  );
