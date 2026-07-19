-- Migration: Create task_management table
-- PHASE 2, STEP 8

CREATE TABLE task_management (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    priority task_priority NOT NULL DEFAULT 'MEDIUM',
    status task_status NOT NULL DEFAULT 'OPEN',
    due_date timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for quick lookup
CREATE INDEX task_management_user_id_idx ON task_management(user_id);
CREATE INDEX task_management_priority_idx ON task_management(priority);
CREATE INDEX task_management_status_idx ON task_management(status);
