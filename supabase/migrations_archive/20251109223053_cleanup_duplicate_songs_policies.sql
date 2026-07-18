-- Clean up duplicate RLS policies on songs table
-- Migration: cleanup_duplicate_songs_policies.sql
-- Issue: Two sets of policies exist from different migrations

-- Drop the old policies from 20251107131530_rls_songs.sql
DROP POLICY IF EXISTS "insert_songs_admin" ON songs;
DROP POLICY IF EXISTS "select_songs_all_roles" ON songs;
DROP POLICY IF EXISTS "update_songs_admin" ON songs;
DROP POLICY IF EXISTS "delete_songs_admin" ON songs;

-- Keep only the newer songs_*_policy policies from 20251109195040_add_soft_delete_to_songs.sql
-- (no need to recreate, they already exist)
