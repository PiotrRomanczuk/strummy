-- Migration: Fix shadow user linking logic with ON UPDATE CASCADE
-- Description: 1. Updates FKs to allow cascading updates on profile ID.
--              2. Updates handle_new_user to link existing profiles by email by updating the profile ID.

-- PART 1: Update Foreign Keys to ON UPDATE CASCADE

-- 1. assignments
ALTER TABLE public.assignments
  DROP CONSTRAINT IF EXISTS "assignments_student_id_fkey",
  ADD CONSTRAINT "assignments_student_id_fkey"
    FOREIGN KEY (student_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.assignments
  DROP CONSTRAINT IF EXISTS "assignments_teacher_id_fkey",
  ADD CONSTRAINT "assignments_teacher_id_fkey"
    FOREIGN KEY (teacher_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 2. lessons
ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS "lessons_student_id_fkey",
  ADD CONSTRAINT "lessons_student_id_fkey"
    FOREIGN KEY (student_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS "lessons_teacher_id_fkey",
  ADD CONSTRAINT "lessons_teacher_id_fkey"
    FOREIGN KEY (teacher_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. user_roles
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS "user_roles_user_id_fkey",
  ADD CONSTRAINT "user_roles_user_id_fkey"
    FOREIGN KEY (user_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE ON UPDATE CASCADE;


-- PART 2: Update Trigger Logic

-- 1. Drop the trigger first
DROP TRIGGER IF EXISTS trigger_handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2. Drop the old function
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Create the new function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  existing_profile_id uuid;
BEGIN
  -- Check if a profile with this email already exists
  SELECT id INTO existing_profile_id
  FROM public.profiles
  WHERE email = new.email
  LIMIT 1;

  IF existing_profile_id IS NOT NULL THEN
    -- Profile exists (Shadow User case)
    -- We update the profile ID to the new auth.uid.
    -- Because of ON UPDATE CASCADE, all dependent rows (lessons, assignments, etc.)
    -- will automatically update to the new ID.
    
    UPDATE public.profiles
    SET 
      id = new.id,
      updated_at = now(),
      full_name = COALESCE(new.raw_user_meta_data->>'full_name', full_name),
      avatar_url = COALESCE(new.raw_user_meta_data->>'avatar_url', avatar_url)
    WHERE id = existing_profile_id;

  ELSE
    -- No existing profile, create a new one
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
      new.id,
      new.email,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'avatar_url'
    );
  END IF;

  RETURN new;
END;
$$;

-- 4. Re-create the trigger
CREATE TRIGGER trigger_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
