-- ============================================================================
-- Migration 018: Materialized Views
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Materialized views for expensive dashboard statistics

-- ============================================================================
-- DASHBOARD STATISTICS
-- ============================================================================
-- Pre-computed stats for user dashboards (refresh periodically)

CREATE MATERIALIZED VIEW mv_dashboard_stats AS
SELECT
    p.id AS user_id,

    -- Lesson counts
    COUNT(DISTINCT l_teacher.id) FILTER (
        WHERE l_teacher.status = 'SCHEDULED'
    ) AS upcoming_lessons_as_teacher,

    COUNT(DISTINCT l_student.id) FILTER (
        WHERE l_student.status = 'SCHEDULED'
    ) AS upcoming_lessons_as_student,

    COUNT(DISTINCT l_teacher.id) FILTER (
        WHERE l_teacher.status = 'COMPLETED'
        AND l_teacher.scheduled_at >= date_trunc('month', now())
    ) AS completed_lessons_this_month,

    -- Assignment counts
    COUNT(DISTINCT a_teacher.id) FILTER (
        WHERE a_teacher.status NOT IN ('completed', 'cancelled')
    ) AS pending_assignments_given,

    COUNT(DISTINCT a_student.id) FILTER (
        WHERE a_student.status NOT IN ('completed', 'cancelled')
    ) AS pending_assignments_received,

    -- Student counts (for teachers)
    COUNT(DISTINCT l_teacher.student_id) AS total_students,

    -- Song counts
    COUNT(DISTINCT ssp.song_id) AS songs_in_progress,

    COUNT(DISTINCT ssp.song_id) FILTER (
        WHERE ssp.current_status = 'mastered'
    ) AS songs_mastered,

    now() AS refreshed_at

FROM profiles p
LEFT JOIN lessons l_teacher ON l_teacher.teacher_id = p.id AND l_teacher.deleted_at IS NULL
LEFT JOIN lessons l_student ON l_student.student_id = p.id AND l_student.deleted_at IS NULL
LEFT JOIN assignments a_teacher ON a_teacher.teacher_id = p.id AND a_teacher.deleted_at IS NULL
LEFT JOIN assignments a_student ON a_student.student_id = p.id AND a_student.deleted_at IS NULL
LEFT JOIN student_song_progress ssp ON ssp.student_id = p.id

WHERE p.is_active = true
GROUP BY p.id;

-- Unique index for CONCURRENTLY refresh
CREATE UNIQUE INDEX ix_mv_dashboard_stats_user ON mv_dashboard_stats(user_id);

-- Comments
COMMENT ON MATERIALIZED VIEW mv_dashboard_stats IS 'Pre-computed dashboard statistics (refresh every 5-15 minutes)';

-- ============================================================================
-- REFRESH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void
LANGUAGE sql
AS $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dashboard_stats;
$$;

COMMENT ON FUNCTION refresh_dashboard_stats IS 'Refresh dashboard stats materialized view (can run concurrently)';

-- ============================================================================
-- SONG POPULARITY
-- ============================================================================
-- Pre-computed song popularity for recommendations

CREATE MATERIALIZED VIEW mv_song_popularity AS
SELECT
    s.id AS song_id,
    s.title,
    s.author,
    s.level,
    COUNT(DISTINCT ls.lesson_id) AS times_assigned,
    COUNT(DISTINCT l.student_id) AS unique_students,
    COUNT(*) FILTER (WHERE ls.status = 'mastered') AS mastery_count,
    ROUND(
        COUNT(*) FILTER (WHERE ls.status = 'mastered')::numeric /
        NULLIF(COUNT(ls.id), 0) * 100, 1
    ) AS mastery_rate,
    AVG(ssp.difficulty_rating)::numeric(2,1) AS avg_difficulty_rating,
    now() AS refreshed_at
FROM songs s
LEFT JOIN lesson_songs ls ON ls.song_id = s.id
LEFT JOIN lessons l ON l.id = ls.lesson_id AND l.deleted_at IS NULL
LEFT JOIN student_song_progress ssp ON ssp.song_id = s.id
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.title, s.author, s.level;

-- Unique index for CONCURRENTLY refresh
CREATE UNIQUE INDEX ix_mv_song_popularity_id ON mv_song_popularity(song_id);

-- Index for sorting by popularity
CREATE INDEX ix_mv_song_popularity_times ON mv_song_popularity(times_assigned DESC);
CREATE INDEX ix_mv_song_popularity_level ON mv_song_popularity(level, times_assigned DESC);

-- Comments
COMMENT ON MATERIALIZED VIEW mv_song_popularity IS 'Pre-computed song popularity metrics (refresh hourly)';

-- ============================================================================
-- REFRESH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_song_popularity()
RETURNS void
LANGUAGE sql
AS $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_song_popularity;
$$;

COMMENT ON FUNCTION refresh_song_popularity IS 'Refresh song popularity materialized view (can run concurrently)';
