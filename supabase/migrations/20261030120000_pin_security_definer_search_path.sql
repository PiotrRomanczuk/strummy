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

DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.audit_log_changes(audit_entity, uuid, audit_action, jsonb, jsonb)',
    'public.check_auth_rate_limit(text, text, bigint)',
    'public.cleanup_auth_rate_limits()',
    'public.cleanup_old_in_app_notifications()',
    'public.get_bounce_stats()',
    'public.get_pending_notifications(integer)',
    'public.get_system_email_count_last_hour()',
    'public.get_user_email_count_last_hour(uuid)',
    'public.has_active_lesson_assignments(uuid)',
    'public.initialize_notification_preferences()',
    'public.is_notification_enabled(uuid, notification_type)',
    'public.mark_overdue_assignments()',
    'public.migrate_pending_student(uuid, uuid)',
    'public.refresh_song_engagement()',
    'public.set_lesson_numbers()',
    'public.soft_delete_song(uuid)',
    'public.soft_delete_song_with_cascade(uuid, uuid)',
    'public.tr_notify_lesson_cancelled()',
    'public.tr_notify_lesson_completed()',
    'public.tr_notify_lesson_rescheduled()',
    'public.tr_notify_song_mastery()',
    'public.tr_notify_student_welcome()',
    'public.tr_update_song_progress()',
    'public.track_lesson_changes()',
    'public.update_song_progress_from_practice(uuid)'
  ]
  LOOP
    -- ALTER FUNCTION has no IF EXISTS; dev and prod may not hold the same set.
    IF to_regprocedure(fn) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path TO ''public'', ''pg_temp''', fn);
    END IF;
  END LOOP;
END
$$;
