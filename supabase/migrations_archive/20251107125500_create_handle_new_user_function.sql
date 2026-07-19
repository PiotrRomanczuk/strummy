-- Migration: Create handle_new_user function
-- PHASE 3, STEP 10
-- Function: handle_new_user()
-- Purpose: Automatically create a profile when a new user is inserted into auth.users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user_id UUID;
    first_name TEXT;
    last_name TEXT;
    full_name TEXT;
    notes TEXT;
BEGIN
    -- Get the new user's ID from the auth.users table
    new_user_id := NEW.id;

    -- Extract first and last name from metadata if available
    first_name := COALESCE(NEW.raw_user_meta_data->>'firstName', NEW.raw_user_meta_data->>'first_name', '');
    last_name := COALESCE(NEW.raw_user_meta_data->>'lastName', NEW.raw_user_meta_data->>'last_name', '');
    full_name := TRIM(first_name || ' ' || last_name);
    notes := COALESCE(NEW.raw_user_meta_data->>'notes', '');

    -- Insert a new profile row if not exists (fully qualified table name)
    INSERT INTO public.profiles (id, email, full_name, notes, created_at, updated_at)
    VALUES (
        new_user_id, 
        NEW.email, 
        CASE WHEN full_name = '' THEN NULL ELSE full_name END,
        CASE WHEN notes = '' THEN NULL ELSE notes END,
        NOW(), 
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating profile for user %: %', new_user_id, SQLERRM;
        RETURN NEW; -- Don't fail user creation if profile creation fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Grant execute permission to supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;

-- Trigger: After insert on auth.users, call handle_new_user
DROP TRIGGER IF EXISTS trigger_handle_new_user ON auth.users;
CREATE TRIGGER trigger_handle_new_user
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
