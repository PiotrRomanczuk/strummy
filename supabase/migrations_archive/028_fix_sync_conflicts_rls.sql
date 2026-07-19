-- ============================================================================
-- Migration 028: Fix sync_conflicts RLS INSERT Policy
-- Guitar CRM - Security Fix (BMS-17)
-- ============================================================================
-- The sync_conflicts_insert_system policy was overly permissive, allowing
-- ANY authenticated user to create conflict records (WITH CHECK (true)).
-- This restricts INSERT to admin and teacher roles only.

-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "sync_conflicts_insert_system" ON sync_conflicts;

-- Create a restricted INSERT policy for admin and teacher roles only
CREATE POLICY sync_conflicts_insert_staff ON sync_conflicts
    FOR INSERT
    WITH CHECK (is_admin_or_teacher());
