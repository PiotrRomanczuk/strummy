-- ============================================================================
-- Migration 033: Notification Triggers
-- Guitar CRM - Automated Notification System
-- ============================================================================
-- Database triggers to automatically queue notifications for critical events

-- ============================================================================
-- TRIGGER FUNCTION: Notify on lesson cancellation
-- ============================================================================

CREATE OR REPLACE FUNCTION tr_notify_lesson_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_name TEXT;
    v_teacher_name TEXT;
    v_lesson_date TEXT;
    v_lesson_time TEXT;
    v_template_data JSONB;
BEGIN
    -- Only proceed if status changed to CANCELLED
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'CANCELLED' THEN
        -- Get student and teacher names
        SELECT full_name INTO v_student_name
        FROM profiles
        WHERE id = NEW.student_id;

        SELECT full_name INTO v_teacher_name
        FROM profiles
        WHERE id = NEW.teacher_id;

        -- Format date and time
        v_lesson_date := to_char(NEW.scheduled_at, 'Day, Month DD, YYYY');
        v_lesson_time := to_char(NEW.scheduled_at, 'HH:MI AM');

        -- Build template data
        v_template_data := jsonb_build_object(
            'studentName', COALESCE(v_student_name, 'Student'),
            'teacherName', COALESCE(v_teacher_name, 'Your Teacher'),
            'lessonDate', v_lesson_date,
            'lessonTime', v_lesson_time,
            'reason', COALESCE(NEW.notes, ''),
            'rescheduleLink', format('%s/dashboard/lessons',
                COALESCE(current_setting('app.base_url', true), 'https://example.com'))
        );

        -- Queue notification for student
        INSERT INTO notification_queue (
            notification_type,
            recipient_user_id,
            template_data,
            scheduled_for,
            priority,
            entity_type,
            entity_id
        ) VALUES (
            'lesson_cancelled',
            NEW.student_id,
            v_template_data,
            now(), -- Send immediately
            8, -- High priority
            'lesson',
            NEW.id
        );

        RAISE NOTICE 'Queued lesson cancellation notification for student %', NEW.student_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_lessons_notify_cancelled
    AFTER UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION tr_notify_lesson_cancelled();

-- ============================================================================
-- TRIGGER FUNCTION: Notify on lesson rescheduled
-- ============================================================================

CREATE OR REPLACE FUNCTION tr_notify_lesson_rescheduled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_name TEXT;
    v_teacher_name TEXT;
    v_old_date TEXT;
    v_old_time TEXT;
    v_new_date TEXT;
    v_new_time TEXT;
    v_template_data JSONB;
BEGIN
    -- Only proceed if scheduled_at changed (and not a cancellation)
    IF OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at
       AND NEW.status != 'CANCELLED' THEN

        -- Get student and teacher names
        SELECT full_name INTO v_student_name
        FROM profiles
        WHERE id = NEW.student_id;

        SELECT full_name INTO v_teacher_name
        FROM profiles
        WHERE id = NEW.teacher_id;

        -- Format old and new dates/times
        v_old_date := to_char(OLD.scheduled_at, 'Day, Month DD, YYYY');
        v_old_time := to_char(OLD.scheduled_at, 'HH:MI AM');
        v_new_date := to_char(NEW.scheduled_at, 'Day, Month DD, YYYY');
        v_new_time := to_char(NEW.scheduled_at, 'HH:MI AM');

        -- Build template data
        v_template_data := jsonb_build_object(
            'studentName', COALESCE(v_student_name, 'Student'),
            'teacherName', COALESCE(v_teacher_name, 'Your Teacher'),
            'oldDate', v_old_date,
            'oldTime', v_old_time,
            'newDate', v_new_date,
            'newTime', v_new_time
        );

        -- Queue notification for student
        INSERT INTO notification_queue (
            notification_type,
            recipient_user_id,
            template_data,
            scheduled_for,
            priority,
            entity_type,
            entity_id
        ) VALUES (
            'lesson_rescheduled',
            NEW.student_id,
            v_template_data,
            now(), -- Send immediately
            8, -- High priority
            'lesson',
            NEW.id
        );

        RAISE NOTICE 'Queued lesson rescheduled notification for student %', NEW.student_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_lessons_notify_rescheduled
    AFTER UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION tr_notify_lesson_rescheduled();

-- ============================================================================
-- TRIGGER FUNCTION: Notify on song mastery achievement
-- ============================================================================

CREATE OR REPLACE FUNCTION tr_notify_song_mastery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_id UUID;
    v_student_name TEXT;
    v_song_title TEXT;
    v_song_artist TEXT;
    v_mastered_date TEXT;
    v_total_mastered INT;
    v_template_data JSONB;
BEGIN
    -- Only proceed if status changed to 'mastered'
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'mastered' THEN

        -- Get student ID from lesson
        SELECT student_id INTO v_student_id
        FROM lessons
        WHERE id = NEW.lesson_id;

        -- Get student name
        SELECT full_name INTO v_student_name
        FROM profiles
        WHERE id = v_student_id;

        -- Get song details
        SELECT title, author INTO v_song_title, v_song_artist
        FROM songs
        WHERE id = NEW.song_id;

        -- Format mastered date
        v_mastered_date := to_char(now(), 'Month DD, YYYY');

        -- Count total mastered songs for this student
        SELECT COUNT(DISTINCT ls.song_id) INTO v_total_mastered
        FROM lesson_songs ls
        JOIN lessons l ON l.id = ls.lesson_id
        WHERE l.student_id = v_student_id
          AND ls.status = 'mastered';

        -- Build template data
        v_template_data := jsonb_build_object(
            'studentName', COALESCE(v_student_name, 'Student'),
            'songTitle', COALESCE(v_song_title, 'Unknown Song'),
            'songArtist', COALESCE(v_song_artist, 'Unknown Artist'),
            'masteredDate', v_mastered_date,
            'totalSongsMastered', v_total_mastered
        );

        -- Queue notification for student
        INSERT INTO notification_queue (
            notification_type,
            recipient_user_id,
            template_data,
            scheduled_for,
            priority,
            entity_type,
            entity_id
        ) VALUES (
            'song_mastery_achievement',
            v_student_id,
            v_template_data,
            now(), -- Send immediately
            6, -- Medium-high priority
            'song_progress',
            NEW.id
        );

        RAISE NOTICE 'Queued song mastery notification for student %', v_student_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_lesson_songs_notify_mastery
    AFTER UPDATE ON lesson_songs
    FOR EACH ROW
    EXECUTE FUNCTION tr_notify_song_mastery();

-- ============================================================================
-- TRIGGER FUNCTION: Notify on lesson completion (for lesson recap)
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

        -- Get songs worked on in this lesson
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

        -- Build template data
        v_template_data := jsonb_build_object(
            'studentName', COALESCE(v_student_name, 'Student'),
            'teacherName', COALESCE(v_teacher_name, 'Your Teacher'),
            'lessonDate', v_lesson_date,
            'lessonTitle', v_lesson_title,
            'songsWorkedOn', COALESCE(v_songs, '[]'::jsonb),
            'notes', COALESCE(NEW.notes, ''),
            'nextLessonDate', NULL -- Will be filled in by cron job if needed
        );

        -- Queue notification for student
        -- Schedule for 1 hour after lesson completion to allow teacher to add notes
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
            now() + interval '1 hour',
            5, -- Normal priority
            'lesson',
            NEW.id
        );

        RAISE NOTICE 'Queued lesson recap notification for student %', NEW.student_id;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_lessons_notify_completed
    AFTER UPDATE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION tr_notify_lesson_completed();

-- ============================================================================
-- TRIGGER FUNCTION: Notify on new student welcome
-- ============================================================================

CREATE OR REPLACE FUNCTION tr_notify_student_welcome()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_teacher_name TEXT;
    v_template_data JSONB;
    v_base_url TEXT;
BEGIN
    -- Only proceed if this is a new student with an auth account (not a shadow user)
    IF NEW.is_student = true AND NOT NEW.is_shadow THEN
        -- For INSERT: welcome new users
        IF TG_OP = 'INSERT' THEN
            -- Get teacher name (if student has lessons scheduled)
            SELECT p.full_name INTO v_teacher_name
            FROM profiles p
            JOIN lessons l ON l.teacher_id = p.id
            WHERE l.student_id = NEW.id
            LIMIT 1;

            v_base_url := COALESCE(current_setting('app.base_url', true), 'https://example.com');

            -- Build template data
            v_template_data := jsonb_build_object(
                'studentName', COALESCE(NEW.full_name, 'Student'),
                'teacherName', COALESCE(v_teacher_name, 'Your Teacher'),
                'loginLink', format('%s/dashboard', v_base_url),
                'firstLessonDate', NULL
            );

            -- Queue welcome notification
            INSERT INTO notification_queue (
                notification_type,
                recipient_user_id,
                template_data,
                scheduled_for,
                priority,
                entity_type,
                entity_id
            ) VALUES (
                'student_welcome',
                NEW.id,
                v_template_data,
                now(), -- Send immediately
                7, -- High priority
                'profile',
                NEW.id
            );

            RAISE NOTICE 'Queued welcome notification for new student %', NEW.id;

        -- For UPDATE: welcome when shadow user converts to real user
        ELSIF TG_OP = 'UPDATE' AND OLD.is_shadow = true AND NEW.is_shadow = false THEN
            -- Get teacher name
            SELECT p.full_name INTO v_teacher_name
            FROM profiles p
            JOIN lessons l ON l.teacher_id = p.id
            WHERE l.student_id = NEW.id
            LIMIT 1;

            v_base_url := COALESCE(current_setting('app.base_url', true), 'https://example.com');

            v_template_data := jsonb_build_object(
                'studentName', COALESCE(NEW.full_name, 'Student'),
                'teacherName', COALESCE(v_teacher_name, 'Your Teacher'),
                'loginLink', format('%s/dashboard', v_base_url),
                'firstLessonDate', NULL
            );

            INSERT INTO notification_queue (
                notification_type,
                recipient_user_id,
                template_data,
                scheduled_for,
                priority,
                entity_type,
                entity_id
            ) VALUES (
                'student_welcome',
                NEW.id,
                v_template_data,
                now(),
                7,
                'profile',
                NEW.id
            );

            RAISE NOTICE 'Queued welcome notification for converted student %', NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_profiles_notify_welcome
    AFTER INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION tr_notify_student_welcome();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION tr_notify_lesson_cancelled IS 'Automatically queue notification when lesson is cancelled';
COMMENT ON FUNCTION tr_notify_lesson_rescheduled IS 'Automatically queue notification when lesson time changes';
COMMENT ON FUNCTION tr_notify_song_mastery IS 'Automatically queue notification when student masters a song';
COMMENT ON FUNCTION tr_notify_lesson_completed IS 'Automatically queue lesson recap notification after completion';
COMMENT ON FUNCTION tr_notify_student_welcome IS 'Automatically queue welcome notification for new students with accounts';
