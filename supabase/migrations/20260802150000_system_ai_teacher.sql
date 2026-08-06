-- Migration to create the System AI Teacher profile for Solo Learners
--
-- is_shadow: the baseline's ck_shadow_user_id CHECK requires
-- (is_shadow = true OR user_id IS NOT NULL), and this profile deliberately has
-- no auth user — so it is a shadow profile by definition. The column was
-- omitted when this file was written, which made the INSERT fail outright on
-- any database where the constraint was already present; the row exists on dev
-- and prod (is_shadow = true, confirmed 2026-08-05) because it was created
-- out-of-band. Added 2026-08-05 so the chain can rebuild a database from
-- scratch — this is a file that never ran, not one being retro-fitted to a
-- later rename (contrast 20260727130000, which must keep its original names).
-- ON CONFLICT DO NOTHING leaves the existing dev/prod rows untouched.

INSERT INTO public.profiles (
  id,
  user_id,
  is_shadow,
  email,
  full_name,
  first_name,
  last_name,
  is_admin,
  is_teacher,
  is_student,
  is_active,
  notes
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  NULL, -- No auth user associated
  true,
  'ai.coach@strummy.online',
  'Strummy AI Coach',
  'Strummy',
  'AI Coach',
  false,
  true,
  false,
  true,
  'System profile used to manage solo learners without human teachers.'
) ON CONFLICT (id) DO NOTHING;

-- Also create a user_roles entry to satisfy some auth/RLS checks if necessary
--
-- profile_id, not user_id: this migration is dated after
-- 20260731143000_rename_profile_fk_columns.sql, so by the time it runs the
-- column has already been renamed. The constraint is `user_roles_unique`
-- (UNIQUE (profile_id, role)); `user_roles_user_id_role_key` has never existed
-- on any stack. Both were corrected 2026-08-05 — as written, this statement
-- could not run anywhere, which is why the row on dev and prod was created
-- out-of-band rather than by this file.
INSERT INTO public.user_roles (
  profile_id,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'teacher'
) ON CONFLICT ON CONSTRAINT user_roles_unique DO NOTHING;
