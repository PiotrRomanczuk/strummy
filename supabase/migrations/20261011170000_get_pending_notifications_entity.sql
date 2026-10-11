-- get_pending_notifications: return the entity the queued row is about.
--
-- Why: notification-queue-processor.ts reads `entity_type` / `entity_id` off
-- every row this RPC returns — for the "already sent for this entity" dedup
-- and to stamp notification_log — but the RETURNS TABLE never included them,
-- so both were always null: the dedup could never match and a delivered
-- reminder was untraceable to its lesson. Found by F03.4 in tests/flows.
--
-- The return type changes, so the function is dropped and re-created
-- (CREATE OR REPLACE refuses a different RETURNS TABLE). Idempotent.

begin;

drop function if exists public.get_pending_notifications(integer);

create function public.get_pending_notifications(batch_size integer default 100)
 returns table(
   id uuid,
   notification_type notification_type,
   recipient_profile_id uuid,
   recipient_email text,
   template_data jsonb,
   scheduled_for timestamp with time zone,
   priority integer,
   entity_type text,
   entity_id uuid
 )
 language plpgsql
 security definer
as $function$
BEGIN
    RETURN QUERY
    SELECT
        nq.id,
        nq.notification_type,
        nq.recipient_profile_id,
        p.email::text,
        nq.template_data,
        nq.scheduled_for,
        nq.priority,
        nq.entity_type,
        nq.entity_id
    FROM notification_queue nq
    JOIN profiles p ON p.id = nq.recipient_profile_id
    WHERE nq.status = 'pending'
      AND nq.scheduled_for <= now()
    ORDER BY nq.priority DESC, nq.scheduled_for ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED;
END;
$function$;

grant execute on function public.get_pending_notifications(integer) to service_role;

commit;
