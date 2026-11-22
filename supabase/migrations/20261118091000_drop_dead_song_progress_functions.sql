-- Migration: drop tr_update_song_progress and update_song_progress_from_practice
-- ============================================================================
-- Date: 2026-11-18.
--
-- update_song_progress_from_practice(uuid) writes to public.student_song_progress,
-- dropped by 20260719000002_drop_deprecated_student_song_progress.sql. That
-- migration meant to drop the function too, but named it without its uuid
-- argument, so the function stayed. tr_update_song_progress() is the trigger
-- function that calls it; no trigger uses it.
--
-- Checked on dev on 2026-11-18: no trigger, no dependant and no other function
-- refers to either. Both were SECURITY DEFINER and executable by anon and
-- authenticated. 20261030120000_pin_security_definer_search_path.sql left
-- dropping them as a separate decision; this is that decision.
-- ============================================================================

DROP FUNCTION IF EXISTS public.tr_update_song_progress();
DROP FUNCTION IF EXISTS public.update_song_progress_from_practice(uuid);
