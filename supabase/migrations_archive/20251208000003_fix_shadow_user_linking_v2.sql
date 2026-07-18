-- Migration: Fix shadow user linking - Replace approach
-- Instead of updating PK (which causes issues), we delete old profile and create new one
-- This preserves all data and relationships via temporary storage

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS trigger_handle_new_user ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved function that handles shadow user linking properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  existing_profile RECORD;
  old_profile_id uuid;
BEGIN
  RAISE NOTICE 'handle_new_user triggered for email=%, id=%', new.email, new.id;
  
  -- Check if a profile with this email already exists (shadow user)
  SELECT * INTO existing_profile
  FROM public.profiles
  WHERE email = new.email
  LIMIT 1;

  IF existing_profile.id IS NOT NULL THEN
    -- Shadow user exists - we need to link it
    old_profile_id := existing_profile.id;
    
    RAISE NOTICE 'Shadow user found: old_id=%, new_id=%, email=%', old_profile_id, new.id, new.email;
    
    -- First, update all foreign key references to point to the new ID
    -- This must happen before we delete the old profile
    
    UPDATE public.lessons
    SET student_id = new.id
    WHERE student_id = old_profile_id;
    
    RAISE NOTICE 'Updated % lessons for student_id', FOUND;
    
    UPDATE public.lessons
    SET teacher_id = new.id
    WHERE teacher_id = old_profile_id;
    
    RAISE NOTICE 'Updated % lessons for teacher_id', FOUND;
    
    UPDATE public.assignments
    SET student_id = new.id
    WHERE student_id = old_profile_id;
    
    RAISE NOTICE 'Updated % assignments for student_id', FOUND;
    
    UPDATE public.assignments
    SET teacher_id = new.id
    WHERE teacher_id = old_profile_id;
    
    RAISE NOTICE 'Updated % assignments for teacher_id', FOUND;
    
    UPDATE public.user_roles
    SET user_id = new.id
    WHERE user_id = old_profile_id;
    
    RAISE NOTICE 'Updated % user_roles', FOUND;
    
    -- Note: user_integrations references auth.users not profiles, so no update needed
    
    -- Delete the old shadow profile
    DELETE FROM public.profiles WHERE id = old_profile_id;
    
    RAISE NOTICE 'Shadow user deleted: old_id=%', old_profile_id;
    
    -- Insert new profile with the auth user's ID, preserving shadow user data
    INSERT INTO public.profiles (
      id, 
      user_id,
      email, 
      full_name, 
      avatar_url, 
      notes,
      phone,
      is_admin,
      is_teacher,
      is_student,
      is_development,
      created_at,
      updated_at
    )
    VALUES (
      new.id,
      new.id,  -- Set user_id to match the auth user ID
      new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', existing_profile.full_name),
      COALESCE(new.raw_user_meta_data->>'avatar_url', existing_profile.avatar_url),
      existing_profile.notes,
      existing_profile.phone,
      existing_profile.is_admin,
      existing_profile.is_teacher,
      existing_profile.is_student,
      existing_profile.is_development,
      existing_profile.created_at,
      now()
    );

  ELSE
    -- No existing profile, create a new one
    INSERT INTO public.profiles (id, user_id, email, full_name, avatar_url)
    VALUES (
      new.id,
      new.id,  -- Set user_id to match the auth user ID
      new.email,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'avatar_url'
    );
  END IF;

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for email %: % %', new.email, SQLERRM, SQLSTATE;
    -- Don't re-raise, just log and continue
    RETURN new;
END;
$$;

-- Re-create the trigger
CREATE TRIGGER trigger_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
