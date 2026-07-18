-- Migration: Extract roles from profiles to user_roles
-- Date: 2025-11-25

-- 1. Migrate Admins
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::user_role
FROM profiles
WHERE is_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. Migrate Teachers
INSERT INTO user_roles (user_id, role)
SELECT id, 'teacher'::user_role
FROM profiles
WHERE is_teacher = true
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Migrate Students
INSERT INTO user_roles (user_id, role)
SELECT id, 'student'::user_role
FROM profiles
WHERE is_student = true
ON CONFLICT (user_id, role) DO NOTHING;
