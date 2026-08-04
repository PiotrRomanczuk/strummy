-- Migration to create the System AI Teacher profile for Solo Learners

INSERT INTO public.profiles (
  id,
  user_id,
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
INSERT INTO public.user_roles (
  user_id,
  role
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'teacher'
) ON CONFLICT ON CONSTRAINT user_roles_user_id_role_key DO NOTHING;
