-- ============================================================================
-- Migration 005: Profiles Table
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Core user table - linked directly to auth.users
-- Key change: profiles.id = auth.users.id (same UUID)

CREATE TABLE profiles (
    -- Primary key matches auth.users.id for direct RLS comparisons
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Contact information
    email email_address NOT NULL UNIQUE,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    avatar_url url,

    -- Role flags (single source of truth, no separate junction table)
    is_admin BOOLEAN NOT NULL DEFAULT false,
    is_teacher BOOLEAN NOT NULL DEFAULT false,
    is_student BOOLEAN NOT NULL DEFAULT false,

    -- Status flags
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_development BOOLEAN NOT NULL DEFAULT false,

    -- Student pipeline tracking (only relevant when is_student = true)
    student_status student_pipeline_status DEFAULT 'lead',
    status_changed_at TIMESTAMPTZ,
    lead_source VARCHAR(255),

    -- Notes (admin/teacher notes about user)
    notes medium_text,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary lookups
CREATE INDEX ix_profiles_email ON profiles(email);

-- Role-based queries
CREATE INDEX ix_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;
CREATE INDEX ix_profiles_is_teacher ON profiles(is_teacher) WHERE is_teacher = true;
CREATE INDEX ix_profiles_is_student ON profiles(is_student) WHERE is_student = true;

-- Active users
CREATE INDEX ix_profiles_is_active ON profiles(is_active) WHERE is_active = true;

-- Student pipeline queries
CREATE INDEX ix_profiles_student_status ON profiles(student_status) WHERE is_student = true;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER tr_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles linked 1:1 with auth.users - stores user details and role flags';
COMMENT ON COLUMN profiles.id IS 'Same UUID as auth.users.id for direct RLS comparison';
COMMENT ON COLUMN profiles.email IS 'User email address - must be unique';
COMMENT ON COLUMN profiles.full_name IS 'Display name shown in UI';
COMMENT ON COLUMN profiles.is_admin IS 'Has full system access';
COMMENT ON COLUMN profiles.is_teacher IS 'Can teach students and manage lessons';
COMMENT ON COLUMN profiles.is_student IS 'Takes lessons from teachers';
COMMENT ON COLUMN profiles.is_active IS 'Active account - false disables login';
COMMENT ON COLUMN profiles.is_development IS 'Development/test account flag';
COMMENT ON COLUMN profiles.student_status IS 'Pipeline stage: lead -> trial -> active -> inactive -> churned';
COMMENT ON COLUMN profiles.status_changed_at IS 'When student_status was last changed';
COMMENT ON COLUMN profiles.lead_source IS 'How the student found us (referral, google, etc.)';

-- ============================================================================
-- ROLE CHECKING FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- ============================================================================

-- Check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT COALESCE(
        (SELECT is_admin FROM profiles WHERE id = auth.uid()),
        false
    );
$$;

-- Check if current user is a teacher
CREATE OR REPLACE FUNCTION is_teacher()
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

-- Check if current user is a student
CREATE OR REPLACE FUNCTION is_student()
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

-- Check if current user is admin or teacher (common permission check)
CREATE OR REPLACE FUNCTION is_admin_or_teacher()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT COALESCE(
        (SELECT is_admin OR is_teacher FROM profiles WHERE id = auth.uid()),
        false
    );
$$;

-- Get all roles for current user (single query, cached result)
CREATE OR REPLACE FUNCTION current_user_roles()
RETURNS TABLE(is_admin boolean, is_teacher boolean, is_student boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT
        COALESCE(is_admin, false),
        COALESCE(is_teacher, false),
        COALESCE(is_student, false)
    FROM profiles
    WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION is_admin() IS 'Check if current user has admin role';
COMMENT ON FUNCTION is_teacher() IS 'Check if current user has teacher role';
COMMENT ON FUNCTION is_student() IS 'Check if current user has student role';
COMMENT ON FUNCTION is_admin_or_teacher() IS 'Check if current user is admin or teacher';
COMMENT ON FUNCTION current_user_roles() IS 'Get all role flags for current user in single query';
