-- Migration: file the untracked trigger_track_lesson_changes trigger
-- ============================================================================
-- Date: 2026-08-05. Found while investigating db-parity drift (67-line
-- schema diff between StudentDevelopment and StudentProduction): the
-- function public.track_lesson_changes() is filed
-- (20260727140000_audit_writers_profile_space.sql), but the trigger that
-- actually wires it to public.lessons was never captured in any migration
-- file — only in the live dev database (confirmed via pg_get_triggerdef on
-- StudentDevelopment). It reached dev out-of-band, in violation of this
-- repo's own "every schema change needs a migration file" rule, which is
-- exactly why db-parity never had a migration to apply to close the gap.
--
-- Idempotent: drop-if-exists before create, so applying this to a database
-- that already has the trigger (StudentDevelopment) is a no-op.
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_track_lesson_changes ON public.lessons;

CREATE TRIGGER trigger_track_lesson_changes
  AFTER INSERT OR DELETE OR UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.track_lesson_changes();
