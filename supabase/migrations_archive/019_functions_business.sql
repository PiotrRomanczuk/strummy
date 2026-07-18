-- ============================================================================
-- Migration 019: Business Logic Functions
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Functions that depend on tables being created

-- ============================================================================
-- LESSON NUMBER GENERATOR
-- ============================================================================

CREATE OR REPLACE FUNCTION set_lesson_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_number INTEGER;
BEGIN
    -- Find the next lesson number for this teacher-student pair
    SELECT COALESCE(MAX(lesson_number), 0) + 1 INTO next_number
    FROM lessons
    WHERE teacher_id = NEW.teacher_id
    AND student_id = NEW.student_id;

    NEW.lesson_number := next_number;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_lesson_number IS 'Auto-sets sequential lesson number per teacher-student pair';

-- ============================================================================
-- SONG DELETION (with cascade checks)
-- ============================================================================

CREATE OR REPLACE FUNCTION has_active_lesson_assignments(p_song_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM lesson_songs ls
        JOIN lessons l ON ls.lesson_id = l.id
        WHERE ls.song_id = p_song_id
        AND l.status IN ('SCHEDULED', 'IN_PROGRESS')
        AND l.deleted_at IS NULL
    );
END;
$$;

CREATE OR REPLACE FUNCTION soft_delete_song(p_song_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    song_record RECORD;
    lesson_count INTEGER;
BEGIN
    -- Check if song exists and is not already deleted
    SELECT * INTO song_record FROM songs WHERE id = p_song_id AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Song not found or already deleted');
    END IF;

    -- Check for active lesson assignments
    IF has_active_lesson_assignments(p_song_id) THEN
        RETURN json_build_object('success', false, 'error', 'Cannot delete song with active lesson assignments');
    END IF;

    -- Count related records
    SELECT COUNT(*) INTO lesson_count FROM lesson_songs WHERE song_id = p_song_id;

    -- Soft delete the song
    UPDATE songs SET deleted_at = now() WHERE id = p_song_id;

    -- Remove lesson song assignments (hard delete since they're junction records)
    DELETE FROM lesson_songs WHERE song_id = p_song_id;

    RETURN json_build_object(
        'success', true,
        'lesson_assignments_removed', lesson_count
    );
END;
$$;

COMMENT ON FUNCTION has_active_lesson_assignments IS 'Check if song has active (scheduled/in-progress) lesson assignments';
COMMENT ON FUNCTION soft_delete_song IS 'Soft delete a song and remove its lesson assignments';

-- ============================================================================
-- AUDIT LOG HELPER
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_log_changes(
    p_entity_type audit_entity,
    p_entity_id uuid,
    p_action audit_action,
    p_changes jsonb,
    p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes, metadata)
    VALUES (p_entity_type, p_entity_id, auth.uid(), p_action, p_changes, p_metadata)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

COMMENT ON FUNCTION audit_log_changes IS 'Insert a record into the audit log';

-- ============================================================================
-- PENDING STUDENT MIGRATION
-- ============================================================================
-- When a pending student signs up, migrate their data to profiles

CREATE OR REPLACE FUNCTION migrate_pending_student(p_pending_id uuid, p_auth_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pending RECORD;
BEGIN
    -- Get pending student record
    SELECT * INTO v_pending FROM pending_students WHERE id = p_pending_id;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    -- Update the new profile with pending student data
    UPDATE profiles
    SET
        full_name = COALESCE(profiles.full_name, v_pending.full_name),
        phone = COALESCE(profiles.phone, v_pending.phone),
        notes = v_pending.notes,
        is_student = true
    WHERE id = p_auth_user_id;

    -- Delete the pending student record
    DELETE FROM pending_students WHERE id = p_pending_id;

    RETURN true;
END;
$$;

COMMENT ON FUNCTION migrate_pending_student IS 'Migrate pending student data to real profile after signup';

-- ============================================================================
-- ASSIGNMENT OVERDUE CHECKER
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_overdue_assignments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE assignments
    SET status = 'overdue'
    WHERE deleted_at IS NULL
    AND status NOT IN ('completed', 'cancelled', 'overdue')
    AND due_date < now();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION mark_overdue_assignments IS 'Mark assignments past due date as overdue (run via cron)';

-- ============================================================================
-- PRACTICE SESSION AGGREGATION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_song_progress_from_practice(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session RECORD;
BEGIN
    SELECT * INTO v_session FROM practice_sessions WHERE id = p_session_id;

    IF v_session.song_id IS NOT NULL THEN
        INSERT INTO student_song_progress (student_id, song_id)
        VALUES (v_session.student_id, v_session.song_id)
        ON CONFLICT (student_id, song_id) DO NOTHING;

        UPDATE student_song_progress
        SET
            total_practice_minutes = total_practice_minutes + v_session.duration_minutes,
            practice_session_count = practice_session_count + 1,
            last_practiced_at = v_session.created_at,
            started_at = COALESCE(started_at, v_session.created_at)
        WHERE student_id = v_session.student_id
        AND song_id = v_session.song_id;
    END IF;
END;
$$;

COMMENT ON FUNCTION update_song_progress_from_practice IS 'Update song progress metrics after practice session';
