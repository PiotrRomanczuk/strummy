-- Migration: Fix shadow user linking FK constraints
-- This fixes the issue where updating FKs to a non-existent profile (because it wasn't inserted yet) failed.
-- Strategy:
-- 1. Insert new profile with temp email (to satisfy FKs)
-- 2. Move related data (lessons, assignments, etc.)
-- 3. Delete old profile
-- 4. Update new profile to correct email

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  existing_profile RECORD;
  old_profile_id uuid;
  temp_email text;
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
    -- Use a valid email format for temp email to pass regex check
    temp_email := 'temp_' || new.id || '@temp.com';
    
    RAISE NOTICE 'Shadow user found: old_id=%, new_id=%, email=%', old_profile_id, new.id, new.email;
    
    -- 1. Create the new profile with a temporary email to satisfy FK constraints
    -- We use a temporary email to avoid unique constraint violation with the existing shadow profile
    -- This will trigger sync_profile_roles, creating the necessary user_roles for the new user
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
      temp_email, -- Temporary email
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

    -- 2. Update foreign key references to point to the new ID
    -- We DO NOT update user_roles, as the INSERT above already triggered creation of new roles
    -- and we want to avoid unique constraint violations.
    
    UPDATE public.lessons
    SET student_id = new.id
    WHERE student_id = old_profile_id;
    
    UPDATE public.lessons
    SET teacher_id = new.id
    WHERE teacher_id = old_profile_id;
    
    UPDATE public.assignments
    SET student_id = new.id
    WHERE student_id = old_profile_id;
    
    UPDATE public.assignments
    SET teacher_id = new.id
    WHERE teacher_id = old_profile_id;

    -- Update assignment_templates
    UPDATE public.assignment_templates
    SET teacher_id = new.id
    WHERE teacher_id = old_profile_id;

    -- Update student_skills
    UPDATE public.student_skills
    SET student_id = new.id
    WHERE student_id = old_profile_id;
    
    -- 3. Delete the old shadow profile
    -- This will cascade delete the old user_roles
    DELETE FROM public.profiles WHERE id = old_profile_id;
    
    RAISE NOTICE 'Shadow user deleted: old_id=%', old_profile_id;
    
    -- 4. Update the new profile with the correct email
    UPDATE public.profiles
    SET email = new.email
    WHERE id = new.id;

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
END;
$$;
