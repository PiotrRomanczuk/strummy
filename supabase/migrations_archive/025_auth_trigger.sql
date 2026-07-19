-- ============================================================================
-- Migration 025: Auth Trigger
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Handle new user signups and pending student migration

-- ============================================================================
-- NEW USER HANDLER
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pending RECORD;
BEGIN
    RAISE NOTICE 'handle_new_user triggered for email=%, id=%', NEW.email, NEW.id;

    -- Check if there's a pending student with this email
    SELECT * INTO v_pending
    FROM pending_students
    WHERE email = NEW.email
    LIMIT 1;

    IF v_pending.id IS NOT NULL THEN
        -- Pending student found - create profile with their data
        RAISE NOTICE 'Found pending student: id=%, email=%', v_pending.id, v_pending.email;

        INSERT INTO profiles (
            id,
            email,
            full_name,
            phone,
            notes,
            is_student,
            created_at
        ) VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', v_pending.full_name),
            v_pending.phone,
            v_pending.notes,
            true,  -- Was created as a pending student
            v_pending.created_at  -- Preserve original creation date
        );

        -- Delete the pending student record
        DELETE FROM pending_students WHERE id = v_pending.id;

        RAISE NOTICE 'Migrated pending student to profile';
    ELSE
        -- No pending student - create new profile
        INSERT INTO profiles (
            id,
            email,
            full_name,
            avatar_url
        ) VALUES (
            NEW.id,
            NEW.email,
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'avatar_url'
        );

        RAISE NOTICE 'Created new profile for user';
    END IF;

    RETURN NEW;

EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in handle_new_user for email %: % %', NEW.email, SQLERRM, SQLSTATE;
        -- Don't re-raise - allow signup to complete
        -- The profile can be created later if needed
        RETURN NEW;
END;
$$;

COMMENT ON FUNCTION handle_new_user IS 'Creates profile for new auth users, migrates pending students if found';

-- ============================================================================
-- CREATE TRIGGER ON AUTH.USERS
-- ============================================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_handle_new_user ON auth.users;

-- Create the trigger
CREATE TRIGGER trigger_handle_new_user
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
