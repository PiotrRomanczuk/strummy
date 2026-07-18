-- Migration: Create profiles table (no role flags)
-- PHASE 2, STEP 3

CREATE TABLE profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    full_name text,
    avatar_url text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    is_development boolean NOT NULL DEFAULT false,
    is_admin boolean NOT NULL DEFAULT false,
    is_teacher boolean NOT NULL DEFAULT false,
    is_student boolean NOT NULL DEFAULT false,
    -- Add other fields as needed
    CONSTRAINT profiles_email_check CHECK (email ~* '^.+@.+\..+$')
);

-- Index for quick lookup
CREATE INDEX profiles_email_idx ON profiles(email);
