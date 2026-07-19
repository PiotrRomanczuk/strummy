-- Migration: Create additional reporting views as needed
-- PHASE 5, STEP 16
-- Migration: Create additional reporting views

-- View: lesson_counts_per_teacher
CREATE OR REPLACE VIEW lesson_counts_per_teacher AS
SELECT
	teacher_id,
	COUNT(*) AS total_lessons
FROM lessons
GROUP BY teacher_id;

-- View: lesson_counts_per_student
CREATE OR REPLACE VIEW lesson_counts_per_student AS
SELECT
	student_id,
	COUNT(*) AS total_lessons
FROM lessons
GROUP BY student_id;

-- View: song_usage_stats
CREATE OR REPLACE VIEW song_usage_stats AS
SELECT
	s.id AS song_id,
	s.title,
	COUNT(ls.id) AS times_assigned
FROM songs s
LEFT JOIN lesson_songs ls ON ls.song_id = s.id
GROUP BY s.id, s.title;
-- TODO: Add reporting views for lessons, songs, progress, etc.
