-- Migration: Create user_roles table (normalized roles)
-- PHASE 2, STEP 4

CREATE TABLE user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    -- Add other fields as needed
    CONSTRAINT user_roles_unique UNIQUE (user_id, role)
);

-- Index for quick lookup
CREATE INDEX user_roles_user_id_idx ON user_roles(user_id);
CREATE INDEX user_roles_role_idx ON user_roles(role);
