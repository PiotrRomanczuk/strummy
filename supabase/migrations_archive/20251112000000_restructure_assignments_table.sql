-- Migration: Restructure assignments table for teacher-student assignments
-- Convert from generic task_management structure to specific assignment structure
-- Changes:
--   - Replace user_id with teacher_id and student_id (both reference profiles)
--   - Remove priority field (not needed for assignments)
--   - Simplify status enum to match AssignmentSchema
--   - Add lesson_id for linking assignments to specific lessons (optional)

-- Step 1: Drop existing policies (will recreate with new structure)
DROP POLICY IF EXISTS select_assignments_user_or_admin ON assignments;
DROP POLICY IF EXISTS insert_assignments_user_or_admin ON assignments;
DROP POLICY IF EXISTS update_assignments_user_or_admin ON assignments;
DROP POLICY IF EXISTS delete_assignments_admin_or_teacher ON assignments;

-- Step 2: Create new status enum
DO $$ BEGIN
    CREATE TYPE assignment_status AS ENUM (
        'not_started',
        'in_progress',
        'completed',
        'overdue',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2.5: Update status column to use new enum
-- First drop the default value which uses the old enum
ALTER TABLE assignments ALTER COLUMN status DROP DEFAULT;

-- Convert old uppercase values to new lowercase values
ALTER TABLE assignments
  ALTER COLUMN status TYPE assignment_status
  USING CASE
    WHEN status::text = 'OPEN' THEN 'not_started'::assignment_status
    WHEN status::text = 'IN_PROGRESS' THEN 'in_progress'::assignment_status
    WHEN status::text = 'COMPLETED' THEN 'completed'::assignment_status
    WHEN status::text = 'CANCELLED' THEN 'cancelled'::assignment_status
    ELSE 'not_started'::assignment_status
  END;

-- Set new default value
ALTER TABLE assignments ALTER COLUMN status SET DEFAULT 'not_started'::assignment_status;

-- Step 3: Add new columns (teacher_id, student_id, lesson_id)
ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS teacher_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS lesson_id uuid REFERENCES lessons(id) ON DELETE SET NULL;

-- Step 4: Migrate data from user_id to student_id (assume existing assignments are for students)
UPDATE assignments
SET student_id = user_id
WHERE student_id IS NULL AND user_id IS NOT NULL;

-- Step 5: Set teacher_id from lessons table where possible
-- For assignments linked to lessons, use the lesson's teacher
UPDATE assignments a
SET teacher_id = l.teacher_id
FROM lessons l
WHERE a.lesson_id = l.id
  AND a.teacher_id IS NULL;

-- Step 6: For assignments without lessons, try to infer teacher from student's lessons
UPDATE assignments a
SET teacher_id = (
  SELECT l.teacher_id
  FROM lessons l
  WHERE l.student_id = a.student_id
  ORDER BY l.created_at DESC
  LIMIT 1
)
WHERE a.teacher_id IS NULL AND a.student_id IS NOT NULL;

-- Step 7: Drop old user_id column
ALTER TABLE assignments
  DROP COLUMN IF EXISTS user_id;

-- Step 8: Make teacher_id and student_id NOT NULL (after migration)
ALTER TABLE assignments
  ALTER COLUMN teacher_id SET NOT NULL,
  ALTER COLUMN student_id SET NOT NULL;

-- Step 9: Drop priority column (not needed for assignments)
ALTER TABLE assignments
  DROP COLUMN IF EXISTS priority;

-- Step 10: Drop old indexes
DROP INDEX IF EXISTS assignments_user_id_idx;
DROP INDEX IF EXISTS assignments_priority_idx;
DROP INDEX IF EXISTS assignments_status_idx;
