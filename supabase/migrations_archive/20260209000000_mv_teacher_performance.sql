-- ============================================================================
-- Migration: Teacher Performance Materialized Views
-- Guitar CRM - Reporting & Analytics
-- ============================================================================
-- Materialized views for teacher performance metrics and trends

-- ============================================================================
-- TEACHER PERFORMANCE METRICS
-- ============================================================================
-- Pre-computed performance metrics per teacher (refresh every 15 minutes)

CREATE MATERIALIZED VIEW mv_teacher_performance AS
SELECT
    p.id AS teacher_id,
    p.full_name AS teacher_name,
    p.email AS teacher_email,

    -- Student counts
    COUNT(DISTINCT CASE
        WHEN student_profiles.student_status = 'active'
        THEN student_profiles.id
    END) AS active_students,

    COUNT(DISTINCT CASE
        WHEN student_profiles.student_status = 'churned'
        THEN student_profiles.id
    END) AS churned_students,

    COUNT(DISTINCT student_profiles.id) AS total_students,

    -- Lesson metrics
    COUNT(DISTINCT l.id) FILTER (
        WHERE l.status = 'COMPLETED'
    ) AS lessons_completed,

    COUNT(DISTINCT l.id) FILTER (
        WHERE l.status = 'SCHEDULED'
    ) AS lessons_scheduled,

    COUNT(DISTINCT l.id) FILTER (
        WHERE l.status = 'CANCELLED'
    ) AS lessons_cancelled,

    COUNT(DISTINCT l.id) AS total_lessons,

    -- Average lessons per student
    ROUND(
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'COMPLETED')::numeric /
        NULLIF(COUNT(DISTINCT student_profiles.id), 0),
        1
    ) AS avg_lessons_per_student,

    -- Lesson completion rate (completed / (completed + scheduled) * 100)
    ROUND(
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'COMPLETED')::numeric /
        NULLIF(
            COUNT(DISTINCT l.id) FILTER (WHERE l.status IN ('COMPLETED', 'SCHEDULED')),
            0
        ) * 100,
        1
    ) AS lesson_completion_rate,

    -- Cancellation rate (cancelled / total * 100)
    ROUND(
        COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'CANCELLED')::numeric /
        NULLIF(COUNT(DISTINCT l.id), 0) * 100,
        1
    ) AS lesson_cancellation_rate,

    -- Song mastery metrics
    COUNT(DISTINCT ssp.song_id) FILTER (
        WHERE ssp.current_status = 'mastered'
    ) AS songs_mastered,

    COUNT(DISTINCT ssp.song_id) FILTER (
        WHERE ssp.current_status IN ('to_learn', 'started', 'remembered', 'with_author', 'mastered')
    ) AS songs_assigned,

    -- Mastery rate (mastered / assigned * 100)
    ROUND(
        COUNT(DISTINCT ssp.song_id) FILTER (WHERE ssp.current_status = 'mastered')::numeric /
        NULLIF(
            COUNT(DISTINCT ssp.song_id) FILTER (WHERE ssp.current_status IN ('to_learn', 'started', 'remembered', 'with_author', 'mastered')),
            0
        ) * 100,
        1
    ) AS song_mastery_rate,

    -- Retention rate (active / (active + churned) * 100)
    ROUND(
        COUNT(DISTINCT CASE WHEN student_profiles.student_status = 'active' THEN student_profiles.id END)::numeric /
        NULLIF(COUNT(DISTINCT student_profiles.id), 0) * 100,
        1
    ) AS retention_rate,

    now() AS refreshed_at

FROM profiles p
LEFT JOIN lessons l ON l.teacher_id = p.id AND l.deleted_at IS NULL
LEFT JOIN profiles student_profiles ON student_profiles.id = l.student_id AND student_profiles.is_active = true
LEFT JOIN student_song_progress ssp ON ssp.student_id = student_profiles.id

WHERE (p.is_teacher OR p.is_admin)
  AND p.is_active = true

GROUP BY p.id, p.full_name, p.email;

-- Unique index for CONCURRENTLY refresh
CREATE UNIQUE INDEX ix_mv_teacher_performance_id ON mv_teacher_performance(teacher_id);

-- Index for sorting by metrics
CREATE INDEX ix_mv_teacher_performance_completion ON mv_teacher_performance(lesson_completion_rate DESC NULLS LAST);
CREATE INDEX ix_mv_teacher_performance_retention ON mv_teacher_performance(retention_rate DESC NULLS LAST);

-- Comments
COMMENT ON MATERIALIZED VIEW mv_teacher_performance IS 'Pre-computed teacher performance metrics (refresh every 15 minutes)';

-- ============================================================================
-- TEACHER LESSON TRENDS
-- ============================================================================
-- Monthly lesson trends per teacher for the last 12 months

CREATE OR REPLACE VIEW v_teacher_lesson_trends AS
SELECT
    p.id AS teacher_id,
    date_trunc('month', l.scheduled_at) AS month,

    COUNT(*) FILTER (WHERE l.status = 'COMPLETED') AS completed,
    COUNT(*) FILTER (WHERE l.status = 'CANCELLED') AS cancelled,
    COUNT(*) FILTER (WHERE l.status = 'SCHEDULED') AS scheduled,
    COUNT(*) AS total

FROM profiles p
LEFT JOIN lessons l ON l.teacher_id = p.id
    AND l.deleted_at IS NULL
    AND l.scheduled_at >= date_trunc('month', now() - interval '12 months')
    AND l.scheduled_at < date_trunc('month', now() + interval '1 month')

WHERE (p.is_teacher OR p.is_admin)
  AND p.is_active = true

GROUP BY p.id, date_trunc('month', l.scheduled_at)
ORDER BY p.id, month DESC;

COMMENT ON VIEW v_teacher_lesson_trends IS 'Monthly lesson trends per teacher for the last 12 months';

-- ============================================================================
-- REFRESH FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_teacher_performance()
RETURNS void
LANGUAGE sql
AS $$
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_teacher_performance;
$$;

COMMENT ON FUNCTION refresh_teacher_performance IS 'Refresh teacher performance materialized view (can run concurrently)';
