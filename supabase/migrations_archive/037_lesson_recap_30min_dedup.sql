-- ============================================================================
-- Migration 037: Lesson Recap 30min Delay + Dedup Fixes
-- ============================================================================
-- 1. Change recap delay from 1 hour to 30 minutes
-- 2. Fix template key: 'songsWorkedOn' → 'songs' (matches render-notification.ts)
-- 3. Fix column reference: s.artist → s.author (matches songs table schema)
-- 4. Update get_pending_notifications() to return entity_type and entity_id

-- ============================================================================
-- FIX: tr_notify_lesson_completed — 30min delay + correct template keys
-- ============================================================================

CREATE OR REPLACE FUNCTION tr_notify_lesson_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_name TEXT;
    v_teacher_name TEXT;
    v_lesson_date TEXT;
    v_lesson_title TEXT;
    v_songs JSONB;
    v_template_data JSONB;
BEGIN
    -- Only proceed if status changed to COMPLETED
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'COMPLETED' THEN

        -- Get student and teacher names
        SELECT full_name INTO v_student_name
        FROM profiles
        WHERE id = NEW.student_id;

        SELECT full_name INTO v_teacher_name
        FROM profiles
        WHERE id = NEW.teacher_id;

        -- Format date
        v_lesson_date := to_char(NEW.scheduled_at, 'Month DD, YYYY');
        v_lesson_title := COALESCE(NEW.title, 'Guitar Lesson');

        -- Get songs worked on in this lesson (use s.author, not s.artist)
        SELECT jsonb_agg(
            jsonb_build_object(
                'title', s.title,
                'artist', s.author,
                'status', ls.status
            )
        ) INTO v_songs
        FROM lesson_songs ls
        JOIN songs s ON s.id = ls.song_id
        WHERE ls.lesson_id = NEW.id;

        -- Build template data (key is 'songs', not 'songsWorkedOn')
        v_template_data := jsonb_build_object(
            'studentName', COALESCE(v_student_name, 'Student'),
            'teacherName', COALESCE(v_teacher_name, 'Your Teacher'),
            'lessonDate', v_lesson_date,
            'lessonTitle', v_lesson_title,
            'songs', COALESCE(v_songs, '[]'::jsonb),
            'notes', COALESCE(NEW.notes, ''),
            'nextLessonDate', NULL
        );

        -- Queue notification for student
        -- Schedule for 30 minutes after completion (was 1 hour)
        INSERT INTO notification_queue (
            notification_type,
            recipient_user_id,
            template_data,
            scheduled_for,
            priority,
            entity_type,
            entity_id
        ) VALUES (
            'lesson_recap',
            NEW.student_id,
            v_template_data,
            now() + interval '30 minutes',
            5, -- Normal priority
            'lesson',
            NEW.id
        );

        RAISE NOTICE 'Queued lesson recap notification (30min delay) for student %', NEW.student_id;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- FIX: get_pending_notifications — add entity_type and entity_id to output
-- ============================================================================

CREATE OR REPLACE FUNCTION get_pending_notifications(batch_size INT DEFAULT 100)
RETURNS TABLE (
    id UUID,
    notification_type notification_type,
    recipient_user_id UUID,
    recipient_email TEXT,
    template_data JSONB,
    scheduled_for TIMESTAMPTZ,
    priority INT,
    entity_type TEXT,
    entity_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        nq.id,
        nq.notification_type,
        nq.recipient_user_id,
        p.email,
        nq.template_data,
        nq.scheduled_for,
        nq.priority,
        nq.entity_type,
        nq.entity_id
    FROM notification_queue nq
    JOIN profiles p ON p.id = nq.recipient_user_id
    WHERE nq.status = 'pending'
      AND nq.scheduled_for <= now()
    ORDER BY nq.priority DESC, nq.scheduled_for ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED;
END;
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION tr_notify_lesson_completed IS 'Queue lesson recap 30min after completion (deduplicates with manual sends)';
COMMENT ON FUNCTION get_pending_notifications IS 'Get batch of pending notifications with entity info for deduplication';
