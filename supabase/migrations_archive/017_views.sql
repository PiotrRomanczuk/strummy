-- ============================================================================
-- Migration 017: Views
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Regular views for common queries

-- ============================================================================
-- LESSON COUNTS PER TEACHER
-- ============================================================================

CREATE OR REPLACE VIEW v_lesson_counts_per_teacher
WITH (security_invoker = true)
AS
SELECT
    teacher_id,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total_lessons,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'SCHEDULED') AS scheduled_lessons,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'COMPLETED') AS completed_lessons,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'CANCELLED') AS cancelled_lessons
FROM lessons
GROUP BY teacher_id;

COMMENT ON VIEW v_lesson_counts_per_teacher IS 'Aggregated lesson counts by teacher';

-- ============================================================================
-- LESSON COUNTS PER STUDENT
-- ============================================================================

CREATE OR REPLACE VIEW v_lesson_counts_per_student
WITH (security_invoker = true)
AS
SELECT
    student_id,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) AS total_lessons,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'SCHEDULED') AS scheduled_lessons,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'COMPLETED') AS completed_lessons,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'CANCELLED') AS cancelled_lessons
FROM lessons
GROUP BY student_id;

COMMENT ON VIEW v_lesson_counts_per_student IS 'Aggregated lesson counts by student';

-- ============================================================================
-- SONG USAGE STATS
-- ============================================================================

CREATE OR REPLACE VIEW v_song_usage_stats
WITH (security_invoker = true)
AS
SELECT
    s.id AS song_id,
    s.title,
    s.author,
    COUNT(DISTINCT ls.id) AS times_assigned,
    COUNT(DISTINCT l.student_id) AS unique_students,
    COUNT(DISTINCT ls.id) FILTER (WHERE ls.status = 'mastered') AS times_mastered
FROM songs s
LEFT JOIN lesson_songs ls ON ls.song_id = s.id
LEFT JOIN lessons l ON l.id = ls.lesson_id AND l.deleted_at IS NULL
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.title, s.author;

COMMENT ON VIEW v_song_usage_stats IS 'Song assignment frequency and mastery statistics';

-- ============================================================================
-- STUDENT OVERVIEW
-- ============================================================================

CREATE OR REPLACE VIEW v_student_overview
WITH (security_invoker = true)
AS
SELECT
    p.id,
    p.email,
    p.full_name,
    p.phone,
    p.student_status,
    p.is_active,
    p.created_at,
    lc.total_lessons,
    lc.completed_lessons,
    lc.scheduled_lessons,
    (
        SELECT MAX(l.scheduled_at)
        FROM lessons l
        WHERE l.student_id = p.id AND l.deleted_at IS NULL
    ) AS last_lesson_at,
    (
        SELECT COUNT(*)
        FROM assignments a
        WHERE a.student_id = p.id
        AND a.deleted_at IS NULL
        AND a.status NOT IN ('completed', 'cancelled')
    ) AS pending_assignments
FROM profiles p
LEFT JOIN v_lesson_counts_per_student lc ON lc.student_id = p.id
WHERE p.is_student = true AND p.is_active = true;

COMMENT ON VIEW v_student_overview IS 'Student dashboard overview with lesson and assignment counts';

-- ============================================================================
-- UPCOMING LESSONS
-- ============================================================================

CREATE OR REPLACE VIEW v_upcoming_lessons
WITH (security_invoker = true)
AS
SELECT
    l.id,
    l.title,
    l.scheduled_at,
    l.status,
    l.teacher_id,
    l.student_id,
    t.full_name AS teacher_name,
    s.full_name AS student_name,
    (
        SELECT json_agg(json_build_object(
            'id', ls.id,
            'song_id', ls.song_id,
            'title', sg.title,
            'status', ls.status
        ))
        FROM lesson_songs ls
        JOIN songs sg ON sg.id = ls.song_id
        WHERE ls.lesson_id = l.id
    ) AS songs
FROM lessons l
JOIN profiles t ON t.id = l.teacher_id
JOIN profiles s ON s.id = l.student_id
WHERE l.deleted_at IS NULL
AND l.status IN ('SCHEDULED', 'IN_PROGRESS')
AND l.scheduled_at >= now() - interval '1 hour';

COMMENT ON VIEW v_upcoming_lessons IS 'Upcoming and in-progress lessons with details';

-- ============================================================================
-- ASSIGNMENT OVERVIEW
-- ============================================================================

CREATE OR REPLACE VIEW v_assignment_overview
WITH (security_invoker = true)
AS
SELECT
    a.id,
    a.title,
    a.status,
    a.due_date,
    a.teacher_id,
    a.student_id,
    t.full_name AS teacher_name,
    s.full_name AS student_name,
    CASE
        WHEN a.status = 'completed' THEN false
        WHEN a.status = 'cancelled' THEN false
        WHEN a.due_date < now() THEN true
        ELSE false
    END AS is_overdue
FROM assignments a
JOIN profiles t ON t.id = a.teacher_id
JOIN profiles s ON s.id = a.student_id
WHERE a.deleted_at IS NULL;

COMMENT ON VIEW v_assignment_overview IS 'Assignment list with teacher/student names and overdue status';
