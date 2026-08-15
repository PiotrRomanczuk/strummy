-- Cal.com intake question "does the student have their own instrument?" needs a
-- home distinct from profiles.instrument (which names *which* instrument, not
-- whether the student owns one). Idempotent — safe to re-run.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_own_instrument boolean;

COMMENT ON COLUMN public.profiles.has_own_instrument IS
  'Whether the student owns their own instrument (distinct from `instrument`, which names which one). Null = unknown.';
