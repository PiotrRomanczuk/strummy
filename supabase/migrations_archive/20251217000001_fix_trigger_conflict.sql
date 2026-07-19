-- Migration: Fix trigger conflict by removing redundant link_shadow_profile trigger
-- This trigger conflicts with handle_new_user which handles shadow user linking more robustly

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.link_shadow_profile();
