-- Migration: Parent read access to child repertoire + onboarding preferences
--
-- Context: the parent/guardian link (profiles.parent_id + is_parent()/
-- is_child_of_parent() helpers) and parent SELECT policies on lessons,
-- assignments, practice_sessions, student_song_progress, songs and profiles
-- already ship in the baseline. The Parent Dashboard ("Family portal") reuses
-- the existing student-detail queries, two of which read tables that had NO
-- parent policy and therefore failed closed for a parent:
--   * student_repertoire  → getStudentRepertoire (songs count / repertoire)
--   * user_preferences     → getStudentPreferences (skill level)
--
-- These add read-only parent access scoped to linked children only, matching
-- the is_child_of_parent(...) convention used by the sibling policies. No leak
-- to non-children: is_child_of_parent() checks profiles.parent_id = auth.uid().
-- Idempotent: drop-if-exists before create so re-applying is safe.

-- Repertoire (student_id column).
DROP POLICY IF EXISTS sr_select_parent ON public.student_repertoire;
CREATE POLICY sr_select_parent ON public.student_repertoire
  FOR SELECT
  TO authenticated
  USING (public.is_child_of_parent(student_id));

-- Onboarding preferences (profile_id column — the file originally said
-- user_id, which doesn't exist on this table; user_preferences has always
-- keyed off profile_id, like every other profile-owned table. Found
-- 2026-08-05 investigating db-parity drift: this migration was registered as
-- applied on StudentProduction but had never actually created this policy
-- there, because running the original SQL fails outright with "column
-- user_id does not exist". The live policy on StudentDevelopment already
-- uses profile_id — presumably hand-corrected there directly at the time —
-- so this file is now brought in line with what's actually live.
DROP POLICY IF EXISTS user_preferences_select_parent ON public.user_preferences;
CREATE POLICY user_preferences_select_parent ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING (public.is_child_of_parent(profile_id));
