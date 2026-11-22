-- Migration: drop migrate_pending_student
-- ============================================================================
-- Date: 2026-11-18.
--
-- The function reads and deletes from public.pending_students, a table no
-- migration creates (it existed only in supabase/migrations_archive/), so any
-- call fails. Nothing calls it: no app code, no trigger, no other function.
-- 20261030120000_pin_security_definer_search_path.sql pinned its search_path
-- and left dropping it as a separate decision; this is that decision.
--
-- It was SECURITY DEFINER and executable by anon and authenticated.
-- ============================================================================

DROP FUNCTION IF EXISTS public.migrate_pending_student(uuid, uuid);
