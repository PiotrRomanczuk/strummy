-- Migration: RLS policies for task_management table
-- Only assigned users and admins can access


CREATE POLICY select_task_management_user_or_admin ON task_management
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR user_id = auth.uid()
  );

CREATE POLICY insert_task_management_user_or_admin ON task_management
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR user_id = auth.uid()
  );

CREATE POLICY update_task_management_user_or_admin ON task_management
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR user_id = auth.uid()
  );

CREATE POLICY delete_task_management_user_or_admin ON task_management
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
    )
    OR user_id = auth.uid()
  );
