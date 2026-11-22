-- tr_audit_lessons compared NEW.status with 'RESCHEDULED', a value the lesson_status enum does not have.
-- Postgres casts the literal to the enum, so every status change that reached that branch — a lesson moved
-- back to SCHEDULED, or to IN_PROGRESS — failed with
--   invalid input value for enum lesson_status: "RESCHEDULED"
-- and the whole UPDATE was rejected. Changes to CANCELLED and COMPLETED returned earlier and worked, which is
-- why it went unnoticed. The lesson balance needs "the teacher took the answer back" to work.
--
-- A reschedule is already recognised by the scheduled_at branch below; the dead comparison is removed.
-- The rest of the body is unchanged from 20260806110000_file_audit_trigger_search_path.sql.

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
