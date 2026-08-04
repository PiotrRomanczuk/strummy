-- Fix get_pending_notifications: citext/text return-type mismatch
--
-- Why: the function's RETURNS TABLE declares recipient_email as text, but
-- profiles.email is citext. Postgres does not implicitly cast citext -> text
-- inside a RETURNS TABLE context, so every call has thrown since the baseline
-- schema:
--   ERROR: structure of query does not match function result type
--   DETAIL: Returned type citext does not match expected type text in column 4.
--
-- Impact: the daily dispatcher cron calls processQueuedNotifications(), which
-- calls this RPC, catches the error, and silently returns {processed: 0,
-- failed: 0} — so no dispatcher-level failure was ever reported. Practical
-- effect: notification_queue rows (student_welcome, assignment_created, ...)
-- have never been delivered; confirmed via Vercel runtime-error logs showing
-- this exact error on every daily run back to 2026-06-22, and every row in
-- notification_queue having processed_at IS NULL.
--
-- Fix: cast p.email explicitly to text in the SELECT list.
--
-- Idempotent: CREATE OR REPLACE.

begin;

CREATE OR REPLACE FUNCTION public.get_pending_notifications(batch_size integer DEFAULT 100)
 RETURNS TABLE(id uuid, notification_type notification_type, recipient_profile_id uuid, recipient_email text, template_data jsonb, scheduled_for timestamp with time zone, priority integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        nq.id,
        nq.notification_type,
        nq.recipient_profile_id,
        p.email::text,
        nq.template_data,
        nq.scheduled_for,
        nq.priority
    FROM notification_queue nq
    JOIN profiles p ON p.id = nq.recipient_profile_id
    WHERE nq.status = 'pending'
      AND nq.scheduled_for <= now()
    ORDER BY nq.priority DESC, nq.scheduled_for ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED;  -- Prevent concurrent processing
END;
$function$;

commit;
