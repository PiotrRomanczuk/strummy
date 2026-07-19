-- ============================================================================
-- Migration 020: Triggers
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- All triggers in one place

-- ============================================================================
-- LESSON NUMBER TRIGGER
-- ============================================================================

CREATE TRIGGER tr_lessons_set_number
    BEFORE INSERT ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION set_lesson_number();

-- ============================================================================
-- AUDIT LOG TRIGGERS
-- ============================================================================

-- Profile changes trigger
CREATE OR REPLACE FUNCTION tr_audit_profiles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_action audit_action;
    v_changes jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Determine specific action type
        IF (OLD.is_admin IS DISTINCT FROM NEW.is_admin) OR
           (OLD.is_teacher IS DISTINCT FROM NEW.is_teacher) OR
           (OLD.is_student IS DISTINCT FROM NEW.is_student) THEN
            v_action := 'role_changed';
        ELSE
            v_action := 'updated';
        END IF;
        -- Store only changed fields
        v_changes := jsonb_build_object(
            'old', jsonb_strip_nulls(to_jsonb(OLD) - to_jsonb(NEW)),
            'new', jsonb_strip_nulls(to_jsonb(NEW) - to_jsonb(OLD))
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'deleted';
        v_changes := to_jsonb(OLD);
        INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
        VALUES ('profile', OLD.id, auth.uid(), v_action, v_changes);
        RETURN OLD;
    END IF;

    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
    VALUES ('profile', NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_profiles_audit
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION tr_audit_profiles();

-- Lesson changes trigger
CREATE OR REPLACE FUNCTION tr_audit_lessons()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_action audit_action;
    v_changes jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            IF NEW.status = 'CANCELLED' THEN
                v_action := 'cancelled';
            ELSIF NEW.status = 'COMPLETED' THEN
                v_action := 'completed';
            ELSIF NEW.status = 'RESCHEDULED' THEN
                v_action := 'rescheduled';
            ELSE
                v_action := 'status_changed';
            END IF;
        ELSIF OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at THEN
            v_action := 'rescheduled';
        ELSE
            v_action := 'updated';
        END IF;
        v_changes := jsonb_build_object(
            'old', jsonb_strip_nulls(to_jsonb(OLD) - to_jsonb(NEW)),
            'new', jsonb_strip_nulls(to_jsonb(NEW) - to_jsonb(OLD))
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'deleted';
        v_changes := to_jsonb(OLD);
        INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
        VALUES ('lesson', OLD.id, auth.uid(), v_action, v_changes);
        RETURN OLD;
    END IF;

    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
    VALUES ('lesson', NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_lessons_audit
    AFTER INSERT OR UPDATE OR DELETE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION tr_audit_lessons();

-- Assignment changes trigger
CREATE OR REPLACE FUNCTION tr_audit_assignments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_action audit_action;
    v_changes jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_action := 'status_changed';
        ELSE
            v_action := 'updated';
        END IF;
        v_changes := jsonb_build_object(
            'old', jsonb_strip_nulls(to_jsonb(OLD) - to_jsonb(NEW)),
            'new', jsonb_strip_nulls(to_jsonb(NEW) - to_jsonb(OLD))
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'deleted';
        v_changes := to_jsonb(OLD);
        INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
        VALUES ('assignment', OLD.id, auth.uid(), v_action, v_changes);
        RETURN OLD;
    END IF;

    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
    VALUES ('assignment', NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_assignments_audit
    AFTER INSERT OR UPDATE OR DELETE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION tr_audit_assignments();

-- Song progress changes trigger
CREATE OR REPLACE FUNCTION tr_audit_song_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_action audit_action;
    v_changes jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            v_action := 'status_changed';
        ELSE
            v_action := 'updated';
        END IF;
        v_changes := jsonb_build_object(
            'old', jsonb_strip_nulls(to_jsonb(OLD) - to_jsonb(NEW)),
            'new', jsonb_strip_nulls(to_jsonb(NEW) - to_jsonb(OLD))
        );
    END IF;

    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
    VALUES ('song_progress', NEW.id, auth.uid(), v_action, v_changes);

    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_lesson_songs_audit
    AFTER INSERT OR UPDATE ON lesson_songs
    FOR EACH ROW
    EXECUTE FUNCTION tr_audit_song_progress();

-- ============================================================================
-- PRACTICE SESSION TRIGGER
-- ============================================================================

-- Wrapper function for practice session trigger
CREATE OR REPLACE FUNCTION tr_update_song_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM update_song_progress_from_practice(NEW.id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_practice_sessions_update_progress
    AFTER INSERT ON practice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION tr_update_song_progress();
