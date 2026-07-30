-- Migration: add locale preference to profiles (Polish i18n rollout)
-- ============================================================================
-- Locale is stored directly on profiles (not a new settings table) per the
-- precedent set in 20260719000003_drop_user_settings.sql, which dropped
-- user_settings noting "no i18n exists ... if [a preference] ever matters,
-- it moves to profiles as a single column."
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_locale_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_locale_check CHECK (locale IN ('en', 'pl'));
