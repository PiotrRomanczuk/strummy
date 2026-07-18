-- ============================================================================
-- Migration 039: Update Triggers for In-App Notifications
-- Guitar CRM - Convert 90% of Email Triggers to In-App Only
-- ============================================================================
-- Updates existing trigger functions to create in-app notifications
-- instead of queuing emails (except lesson_recap and student_welcome)

-- ============================================================================
-- TRIGGER FUNCTION: Notify on lesson cancellation (IN-APP ONLY)
-- ============================================================================

CREATE OR REPLACE FUNCTION tr_notify_lesson_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_name TEXT;
    v_lesson_date TEXT;
    v_lesson_time TEXT;
BEGIN
    -- Only proceed if status changed to CANCELLED
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'CANCELLED' THEN
        -- Get student name
        SELECT full_name INTO v_student_name
        FROM profiles
        WHERE id = NEW.student_id;

        -- Format date and time
        v_lesson_date := to_char(NEW.scheduled_at, 'Day, Month DD, YYYY');
        v_lesson_time := to_char(NEW.scheduled_at, 'HH:MI AM');

        -- Create in-app notification (in-app only, no email)
        INSERT INTO in_app_notifications (
            user_id,
            notification_type,
            title,
            body,
            icon,
            variant,
            action_url,
            action_label,
            entity_type,
            entity_id,
            priority
        ) VALUES (
            NEW.student_id,
            'lesson_cancelled',
            'Lesson Cancelled',
            format('Your lesson on %s at %s has been cancelled', v_lesson_date, v_lesson_time),
            '❌',
            'warning',
            '/dashboard/lessons',
            'View Details',
            'lesson',
            NEW.id::text,
            9
        );

        RAISE NOTICE 'Created in-app notification: lesson cancelled for student %', NEW.student_id;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTION: Notify on lesson rescheduled (IN-APP ONLY)
-- ============================================================================

CREATE OR REPLACE FUNCTION tr_notify_lesson_rescheduled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_name TEXT;
    v_new_date TEXT;
    v_new_time TEXT;
BEGIN
    -- Only proceed if scheduled_at changed (and not a cancellation)
    IF OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at
       AND NEW.status != 'CANCELLED' THEN

        -- Get student name
        SELECT full_name INTO v_student_name
        FROM profiles
        WHERE id = NEW.student_id;

        -- Format new date/time
        v_new_date := to_char(NEW.scheduled_at, 'Day, Month DD, YYYY');
        v_new_time := to_char(NEW.scheduled_at, 'HH:MI AM');

        -- Create in-app notification (in-app only, no email)
        INSERT INTO in_app_notifications (
            user_id,
            notification_type,
            title,
            body,
            icon,
            variant,
            action_url,
            action_label,
            entity_type,
            entity_id,
            priority
        ) VALUES (
            NEW.student_id,
            'lesson_rescheduled',
            'Lesson Rescheduled',
            format('Your lesson has been moved to %s at %s', v_new_date, v_new_time),
            '🔄',
            'info',
            '/dashboard/lessons',
            'View New Time',
            'lesson',
            NEW.id::text,
            7
        );

        RAISE NOTICE 'Created in-app notification: lesson rescheduled for student %', NEW.student_id;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTION: Notify on song mastery achievement (IN-APP ONLY)
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
    v_total_mastered INT;
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
        SELECT title, artist INTO v_song_title, v_song_artist
        FROM songs
        WHERE id = NEW.song_id;

        -- Count total mastered songs for this student
        SELECT COUNT(DISTINCT ls.song_id) INTO v_total_mastered
        FROM lesson_songs ls
        JOIN lessons l ON l.id = ls.lesson_id
        WHERE l.student_id = v_student_id
          AND ls.status = 'mastered';

        -- Create in-app notification (in-app only, no email)
        INSERT INTO in_app_notifications (
            user_id,
            notification_type,
            title,
            body,
            icon,
            variant,
            action_url,
            action_label,
            entity_type,
            entity_id,
            priority
        ) VALUES (
            v_student_id,
            'song_mastery_achievement',
            'Song Mastered!',
            format('You mastered "%s" by %s! 🎉 Total songs mastered: %s',
                   COALESCE(v_song_title, 'Unknown Song'),
                   COALESCE(v_song_artist, 'Unknown Artist'),
                   v_total_mastered),
            '🎸',
            'success',
            '/dashboard/songs',
            'View Progress',
            'song_progress',
            NEW.id::text,
            6
        );

        RAISE NOTICE 'Created in-app notification: song mastery for student %', v_student_id;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGER FUNCTION: Notify on lesson completion (EMAIL ONLY - lesson_recap)
-- ============================================================================
-- lesson_recap remains EMAIL ONLY (no changes to this trigger)
-- This trigger still queues email notifications as before

-- No changes needed for tr_notify_lesson_completed() - it remains email-only

-- ============================================================================
-- TRIGGER FUNCTION: Notify on student welcome (EMAIL ONLY)
-- ============================================================================
-- student_welcome remains EMAIL ONLY (no changes to this trigger)
-- This trigger still queues email notifications as before

-- No changes needed for tr_notify_student_welcome() - it remains email-only

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION tr_notify_lesson_cancelled IS 'Create in-app notification when lesson is cancelled (in-app only, no email)';
COMMENT ON FUNCTION tr_notify_lesson_rescheduled IS 'Create in-app notification when lesson time changes (in-app only, no email)';
COMMENT ON FUNCTION tr_notify_song_mastery IS 'Create in-app notification when student masters a song (in-app only, no email)';
