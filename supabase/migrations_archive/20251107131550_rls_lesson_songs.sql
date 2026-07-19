-- Migration: RLS policies for lesson_songs table
-- Only lesson participants and admins can access

-- Allow authenticated users to read lesson_songs (general access)
CREATE POLICY "Allow authenticated users to read lesson_songs" ON lesson_songs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY select_lesson_songs_participants ON lesson_songs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
    OR lesson_id IN (
      SELECT id FROM lessons WHERE teacher_id = auth.uid() OR student_id = auth.uid()
    )
  );

CREATE POLICY insert_lesson_songs_admin ON lesson_songs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR is_teacher = true)
    )
    OR lesson_id IN (
      SELECT id FROM lessons WHERE teacher_id = auth.uid()
    )
  );

CREATE POLICY update_lesson_songs_admin ON lesson_songs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR is_teacher = true)
    )
    OR lesson_id IN (
      SELECT id FROM lessons WHERE teacher_id = auth.uid() OR student_id = auth.uid()
    )
  );

CREATE POLICY delete_lesson_songs_admin ON lesson_songs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR is_teacher = true)
    )
    OR lesson_id IN (
      SELECT id FROM lessons WHERE teacher_id = auth.uid() OR student_id = auth.uid()
    )
  );
