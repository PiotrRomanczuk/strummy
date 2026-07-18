-- Migration: Create triggers for profile creation, updated_at, lesson numbering
-- PHASE 3, STEP 12
-- Triggers for profile creation, updated_at, and lesson numbering

-- Profile creation: already handled by handle_new_user on auth.users

-- Trigger: update updated_at column on update for all main tables
DO $$
DECLARE
	table_name TEXT;
BEGIN
	FOR table_name IN SELECT unnest(ARRAY['profiles', 'songs', 'lessons', 'lesson_songs', 'task_management'])
	LOOP
		EXECUTE format('DROP TRIGGER IF EXISTS trigger_update_updated_at ON %I;', table_name);
		EXECUTE format('CREATE TRIGGER trigger_update_updated_at
			BEFORE UPDATE ON %I
			FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();', table_name);
	END LOOP;
END $$;

-- Trigger: set lesson_teacher_number on insert into lessons
DROP TRIGGER IF EXISTS trigger_set_lesson_numbers ON lessons;
CREATE TRIGGER trigger_set_lesson_numbers
BEFORE INSERT ON lessons
FOR EACH ROW EXECUTE FUNCTION set_lesson_numbers();
-- Trigger for updated_at on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- TODO: Add triggers for profile creation and lesson numbering as needed
