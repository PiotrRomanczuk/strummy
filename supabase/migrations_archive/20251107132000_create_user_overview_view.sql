-- Migration: Create user_overview view (roles calculated from user_roles)
-- PHASE 5, STEP 15
-- Migration: Create user_overview view
-- Shows user info and calculated role flags from user_roles

CREATE OR REPLACE VIEW user_overview AS
SELECT
	p.id AS user_id,
	p.email,
	p.created_at,
	p.updated_at,
	-- Role flags calculated from user_roles
	bool_or(ur.role = 'admin') AS is_admin,
	bool_or(ur.role = 'teacher') AS is_teacher,
	bool_or(ur.role = 'student') AS is_student
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.email, p.created_at, p.updated_at;
-- TODO: Implement user_overview view joining profiles and user_roles
