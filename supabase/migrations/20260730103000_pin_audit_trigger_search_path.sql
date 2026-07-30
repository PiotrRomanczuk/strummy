-- Migration: pin search_path on the audit trigger functions
-- ============================================================================
-- Date: 2026-07-30.
--
-- Bug: deleting ANY auth user fails with
--   ERROR: type "audit_action" does not exist (SQLSTATE 42704)
--   -> POST/DELETE /auth/v1/admin/users/<id> returns
--      500 {"error_code":"unexpected_failure","msg":"Database error deleting user"}
--
-- Cause: the four tr_audit_* functions are SECURITY DEFINER but have no
-- `SET search_path`, so they inherit the CALLER's search_path. GoTrue connects
-- as supabase_auth_admin, whose role config is `search_path=auth` — no public.
-- Deleting an auth.users row cascades to public.profiles via
-- profiles_user_id_fkey (ON DELETE CASCADE), which fires tr_audit_profiles,
-- which declares `v_action audit_action` and inserts into `audit_log` — both
-- unqualified, both in public, therefore unresolvable. The trigger aborts the
-- whole transaction, so the delete can never succeed through the Auth API.
-- (Verified on StudentDevelopment: 500 before, 204 after.)
--
-- Fix: pin search_path on all four. Bodies are left untouched.
--
-- Secondary hardening: pg_temp is listed LAST on purpose. Postgres searches the
-- temporary schema first unless it appears explicitly in search_path, so a
-- caller able to create temp tables could otherwise shadow the unqualified
-- `audit_log` relation these functions write to and divert audit rows.
--
-- Note: 29 of 53 SECURITY DEFINER functions in public are still unpinned. Only
-- these four are reachable from supabase_auth_admin, so only these four are in
-- scope here; the rest are tracked separately.
-- ============================================================================

DO $$
DECLARE
    v_fn text;
    v_missing text[] := '{}';
BEGIN
    FOREACH v_fn IN ARRAY ARRAY[
        'public.tr_audit_assignments()',
        'public.tr_audit_lessons()',
        'public.tr_audit_profiles()',
        'public.tr_audit_song_progress()'
    ]
    LOOP
        -- to_regprocedure returns NULL instead of raising when absent, which
        -- keeps this migration replayable against a partially-built database.
        IF to_regprocedure(v_fn) IS NULL THEN
            v_missing := v_missing || v_fn;
            CONTINUE;
        END IF;

        EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', v_fn);
        RAISE NOTICE 'pinned search_path on %', v_fn;
    END LOOP;

    IF cardinality(v_missing) > 0 THEN
        RAISE NOTICE 'skipped (not present): %', array_to_string(v_missing, ', ');
    END IF;
END
$$;
