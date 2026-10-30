-- Migration: pin search_path on the remaining SECURITY DEFINER functions (STR-6)
-- ============================================================================
-- Date: 2026-10-30.
--
-- These 25 functions run with the owner's rights but resolve unqualified names
-- through the caller's search_path, so a caller who controls it can point them
-- at their own objects. Same fix and same pg_temp reasoning as
-- 20260730103000_pin_audit_trigger_search_path.sql. Bodies are left untouched.
--
-- Reviewed against production on 2026-10-30: no dynamic SQL, and every function
-- called resolves in public or pg_catalog, so nothing depends on a schema
-- outside this path.
--
-- migrate_pending_student, tr_update_song_progress and
-- update_song_progress_from_practice reference tables that no longer exist and
-- have no caller. They are pinned here too; dropping them is a separate decision.
-- ============================================================================

ALTER FUNCTION IF EXISTS public.audit_log_changes(audit_entity, uuid, audit_action, jsonb, jsonb) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.check_auth_rate_limit(text, text, bigint) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.cleanup_auth_rate_limits() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.cleanup_old_in_app_notifications() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.get_bounce_stats() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.get_pending_notifications(integer) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.get_system_email_count_last_hour() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.get_user_email_count_last_hour(uuid) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.has_active_lesson_assignments(uuid) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.initialize_notification_preferences() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.is_notification_enabled(uuid, notification_type) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.mark_overdue_assignments() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.migrate_pending_student(uuid, uuid) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.refresh_song_engagement() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.set_lesson_numbers() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.soft_delete_song(uuid) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.soft_delete_song_with_cascade(uuid, uuid) SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.tr_notify_lesson_cancelled() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.tr_notify_lesson_completed() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.tr_notify_lesson_rescheduled() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.tr_notify_song_mastery() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.tr_notify_student_welcome() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.tr_update_song_progress() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.track_lesson_changes() SET search_path TO 'public', 'pg_temp';
ALTER FUNCTION IF EXISTS public.update_song_progress_from_practice(uuid) SET search_path TO 'public', 'pg_temp';
