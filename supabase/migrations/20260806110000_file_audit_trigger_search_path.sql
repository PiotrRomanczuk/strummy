-- Migration: file the untracked SET search_path on the audit trigger functions
-- ============================================================================
-- Date: 2026-08-05. Found while closing the db-parity drift (same
-- investigation as 20260806100000): tr_audit_assignments, tr_audit_lessons,
-- tr_audit_song_progress and tr_audit_profiles all carry a
-- `SET search_path TO 'public', 'pg_temp'` clause on StudentDevelopment —
-- standard hardening against search_path injection in a SECURITY DEFINER
-- function — that no migration file ever added. 20260727140000 defines these
-- same four functions (verbatim bodies, confirmed via pg_get_functiondef)
-- without the clause, so re-running that file does not add it; the clause
-- reached dev out-of-band.
--
-- Idempotent: CREATE OR REPLACE FUNCTION, so applying this to a database that
-- already has the clause (StudentDevelopment) is a no-op.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.tr_audit_assignments()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
            'old', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW))),
            'new', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(NEW), to_jsonb(OLD)))
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'deleted';
        v_changes := to_jsonb(OLD);
        INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
        VALUES ('assignment', OLD.id, public.current_profile_id(), v_action, v_changes);
        RETURN OLD;
    END IF;

    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
    VALUES ('assignment', NEW.id, public.current_profile_id(), v_action, v_changes);

    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.tr_audit_lessons()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
            'old', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW))),
            'new', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(NEW), to_jsonb(OLD)))
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'deleted';
        v_changes := to_jsonb(OLD);
        INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
        VALUES ('lesson', OLD.id, public.current_profile_id(), v_action, v_changes);
        RETURN OLD;
    END IF;

    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
    VALUES ('lesson', NEW.id, public.current_profile_id(), v_action, v_changes);

    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.tr_audit_profiles()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
    v_action audit_action;
    v_changes jsonb;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_action := 'created';
        v_changes := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        IF (OLD.is_admin IS DISTINCT FROM NEW.is_admin) OR
           (OLD.is_teacher IS DISTINCT FROM NEW.is_teacher) OR
           (OLD.is_student IS DISTINCT FROM NEW.is_student) THEN
            v_action := 'role_changed';
        ELSE
            v_action := 'updated';
        END IF;
        v_changes := jsonb_build_object(
            'old', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW))),
            'new', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(NEW), to_jsonb(OLD)))
        );
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'deleted';
        v_changes := to_jsonb(OLD);
        INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
        VALUES ('profile', OLD.id, public.current_profile_id(), v_action, v_changes);
        RETURN OLD;
    END IF;

    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
    VALUES ('profile', NEW.id, public.current_profile_id(), v_action, v_changes);

    RETURN NEW;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.tr_audit_song_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
            'old', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(OLD), to_jsonb(NEW))),
            'new', jsonb_strip_nulls(public.jsonb_diff(to_jsonb(NEW), to_jsonb(OLD)))
        );
    END IF;

    INSERT INTO audit_log (entity_type, entity_id, actor_id, action, changes)
    VALUES ('song_progress', NEW.id, public.current_profile_id(), v_action, v_changes);

    RETURN NEW;
END;
$function$
;
