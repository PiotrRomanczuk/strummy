-- ============================================================================
-- Migration: enforce uniqueness on profiles.invite_email
-- ============================================================================
--
-- Context (see tasks/unbreakable-core.md → authz:invite-email-uniqueness):
--   Today the index `ix_profiles_invite_email` (migration 20260425000000) is a
--   non-unique partial index. The application layer has a uniqueness check in
--   PATCH /api/users (`.or(email.eq.X,invite_email.eq.X)`), but it's a TOCTOU
--   race: two concurrent PATCH requests for different shadows with the same
--   invite_email can both pass the check and both succeed.
--
--   This migration replaces the index with a UNIQUE partial index so the race
--   resolves at the DB layer with a 23505 error that the action turns into a
--   409 response.
--
-- ⚠️  PRE-FLIGHT CHECK (run BEFORE applying — DO NOT auto-apply):
--
--   SELECT lower(invite_email) AS email, count(*) AS dup_count, array_agg(id) AS profile_ids
--   FROM profiles
--   WHERE invite_email IS NOT NULL
--   GROUP BY lower(invite_email)
--   HAVING count(*) > 1;
--
--   - If 0 rows: safe to apply.
--   - If >0 rows: resolve the duplicates first (delete or rename) before
--     applying. The CREATE UNIQUE INDEX will fail otherwise.
--
-- Rollback:
--   DROP INDEX IF EXISTS uq_profiles_invite_email;
--   CREATE INDEX IF NOT EXISTS ix_profiles_invite_email
--     ON profiles(invite_email)
--     WHERE invite_email IS NOT NULL;
-- ============================================================================

-- 1. Drop the non-unique index.
DROP INDEX IF EXISTS ix_profiles_invite_email;

-- 2. Create the unique partial index.
--    Partial: only enforces uniqueness on rows where invite_email IS NOT NULL.
--    Case-insensitive: matches the lookup pattern in PATCH /api/users where
--    we'd otherwise risk "Alice@x.com" and "alice@x.com" both linking on signup.
CREATE UNIQUE INDEX uq_profiles_invite_email
  ON profiles(lower(invite_email))
  WHERE invite_email IS NOT NULL;

COMMENT ON INDEX uq_profiles_invite_email IS
  'Enforces case-insensitive uniqueness of invite_email across non-null rows. '
  'Closes the TOCTOU race in PATCH /api/users.';
