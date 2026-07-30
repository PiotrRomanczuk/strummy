-- Fix profiles_skill_level_check to allow 'novice'.
--
-- The onboarding wizard's "Where are you with guitar?" step (StepJourney,
-- onboarding.constants.ts) offers four skill levels: beginner, novice,
-- intermediate, advanced. The check constraint only ever allowed three
-- (missing 'novice'), so every student picking "A few months in" hit
-- "new row for relation profiles violates check constraint
-- profiles_skill_level_check" and the onboarding step failed with
-- "Failed to update profile" for every real user, not just test accounts.
-- Idempotent: drops and recreates the constraint.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_skill_level_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_skill_level_check
  CHECK (skill_level IS NULL OR skill_level = ANY (ARRAY['beginner'::text, 'novice'::text, 'intermediate'::text, 'advanced'::text]));
