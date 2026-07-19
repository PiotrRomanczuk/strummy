-- Migration: Rename task_management to assignments
-- More domain-appropriate name for Guitar CRM (teacher assigns work to students)

-- Rename the table
ALTER TABLE task_management RENAME TO assignments;

-- Rename indexes
ALTER INDEX task_management_user_id_idx RENAME TO assignments_user_id_idx;
ALTER INDEX task_management_priority_idx RENAME TO assignments_priority_idx;
ALTER INDEX task_management_status_idx RENAME TO assignments_status_idx;

-- Update RLS policy names (drop old policies and recreate with new names)
DROP POLICY IF EXISTS select_task_management_user_or_admin ON assignments;
DROP POLICY IF EXISTS insert_task_management_user_or_admin ON assignments;
DROP POLICY IF EXISTS update_task_management_user_or_admin ON assignments;
DROP POLICY IF EXISTS delete_task_management_user_or_admin ON assignments;

-- Recreate RLS policies with new names
-- Note: Using profiles.is_admin/is_teacher instead of user_roles table for consistency
CREATE POLICY select_assignments_user_or_admin ON assignments
    FOR SELECT
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

CREATE POLICY insert_assignments_user_or_admin ON assignments
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_admin = true OR profiles.is_teacher = true)
        )
    );

CREATE POLICY update_assignments_user_or_admin ON assignments
    FOR UPDATE
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_admin = true OR profiles.is_teacher = true)
        )
    );

CREATE POLICY delete_assignments_admin_or_teacher ON assignments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_admin = true OR profiles.is_teacher = true)
        )
    );

-- Update trigger if exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trigger_update_updated_at'
        AND tgrelid = 'assignments'::regclass
    ) THEN
        -- Trigger already references the table, no action needed
        NULL;
    END IF;
END $$;

-- Note: Enums (task_priority, task_status) remain unchanged as they're still semantically correct
-- An assignment has priority and status, which aligns with the existing enum names

-- Optional: Rename enums for better domain clarity (assignment_priority, assignment_status)
-- Uncomment below if you want more specific enum names:

-- ALTER TYPE task_priority RENAME TO assignment_priority;
-- ALTER TYPE task_status RENAME TO assignment_status;

-- If enums are renamed, also update the column types:
-- ALTER TABLE assignments ALTER COLUMN priority TYPE assignment_priority USING priority::text::assignment_priority;
-- ALTER TABLE assignments ALTER COLUMN status TYPE assignment_status USING status::text::assignment_status;

COMMENT ON TABLE assignments IS 'Teacher-assigned work/practice for students in the Guitar CRM system';
