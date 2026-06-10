-- ============================================================================
-- Migration: Fix handle_new_user step ordering
-- ============================================================================
-- 2026-06-08
--
-- BUG (introduced in 20260425000002_rewrite_handle_new_user_trigger.sql):
-- The trigger called transfer_shadow_profile_references() BEFORE inserting
-- the new profile row. The transfer function UPDATEs FK columns (e.g.
-- lessons.student_id) to point at new.id, but profiles(id = new.id) does not
-- yet exist at that point, so the FK check fails:
--
--   ERROR: insert or update on table "lessons" violates foreign key constraint
--   "lessons_student_id_fkey"
--   PL/pgSQL function handle_new_user() line 39 at SQL statement
--
-- The bug was masked when shadow profiles had no related rows (transfer
-- function UPDATEs 0 rows so no FK check fires). Any shadow profile with a
-- lesson/assignment/notification etc. would fail to convert.
--
-- FIX: Swap the order — insert the new profile FIRST (so profiles(id=new.id)
-- exists), THEN transfer FKs to it, THEN delete the old shadow profile.
--
-- Caught by scripts/verify/onboarding.ts on 2026-06-08.

DROP TRIGGER IF EXISTS trigger_handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  existing_profile RECORD;
  old_profile_id UUID;
  temp_email TEXT;
  transfer_result JSONB;
BEGIN
  RAISE NOTICE 'handle_new_user triggered for email=%, id=%', new.email, new.id;

  -- Step 1: Look for an existing profile to link
  -- Priority 1: Non-shadow profile with matching email (admin-created user)
  -- Priority 2: Shadow profile with matching invite_email (invited student)
  -- Priority 3: Shadow profile with matching email (edge case)
  SELECT * INTO existing_profile
  FROM public.profiles
  WHERE (
    (email = new.email AND NOT is_shadow)
    OR (invite_email = new.email AND is_shadow)
    OR (email = new.email AND is_shadow)
  )
    AND id != new.id
  ORDER BY
    CASE
      WHEN email = new.email AND NOT is_shadow THEN 1
      WHEN invite_email = new.email AND is_shadow THEN 2
      WHEN email = new.email AND is_shadow THEN 3
    END
  LIMIT 1;

  IF existing_profile.id IS NOT NULL THEN
    old_profile_id := existing_profile.id;
    temp_email := 'temp_' || new.id || '@temp.com';

    RAISE NOTICE 'Linking profile: old_id=%, new_id=%, is_shadow=%',
      old_profile_id, new.id, existing_profile.is_shadow;

    -- Step 2 (FIRST): create the new profile so it can be the target of the
    -- transfer's FK updates. Uses temp email to avoid colliding on the unique
    -- email constraint with the old profile.
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
      is_shadow,
      student_status,
      created_at,
      updated_at
    )
    VALUES (
      new.id,
      new.id,
      temp_email,
      COALESCE(new.raw_user_meta_data->>'full_name', existing_profile.full_name),
      COALESCE(new.raw_user_meta_data->>'avatar_url', existing_profile.avatar_url),
      existing_profile.notes,
      existing_profile.phone,
      existing_profile.is_admin,
      existing_profile.is_teacher,
      existing_profile.is_student,
      existing_profile.is_development,
      false,
      existing_profile.student_status,
      existing_profile.created_at,
      now()
    );

    -- Step 3: now that profiles(id = new.id) exists, transfer all FK references
    -- from the old profile to it.
    SELECT transfer_shadow_profile_references(old_profile_id, new.id)
      INTO transfer_result;

    RAISE NOTICE 'Transfer result: %', transfer_result;

    -- Step 4: delete the old (shadow) profile
    DELETE FROM public.profiles WHERE id = old_profile_id;

    RAISE NOTICE 'Old profile deleted: id=%', old_profile_id;

    -- Step 5: set the correct email and clear invite_email on the new profile
    UPDATE public.profiles
    SET email = new.email,
        invite_email = NULL
    WHERE id = new.id;

  ELSE
    -- No existing profile to link — create fresh
    INSERT INTO public.profiles (id, user_id, email, full_name, avatar_url)
    VALUES (
      new.id,
      new.id,
      new.email,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'avatar_url'
    );
  END IF;

  RETURN new;
END;
$$;

CREATE TRIGGER trigger_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
