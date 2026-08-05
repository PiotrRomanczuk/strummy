-- lesson_history exists on both dev and production — referenced by the
-- shadow-profile-transfer function since 2026-07-19 (IDA-8) and written by
-- the audit-writer migration on 2026-07-27 — but no migration ever created
-- the table itself, so `database.types.ts` generation silently drifted.
-- This formalizes the live schema; every clause is idempotent.

CREATE TABLE IF NOT EXISTS public.lesson_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  changed_by uuid NOT NULL,
  change_type text NOT NULL,
  previous_data jsonb,
  new_data jsonb NOT NULL,
  changed_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.lesson_history IS
  'Revision timeline for lessons, mirroring assignment_history. Read by
   getLessonHistory (lib/services/lesson-detail-queries.ts).';

ALTER TABLE public.lesson_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view lesson history" ON public.lesson_history;
CREATE POLICY "Users can view lesson history"
  ON public.lesson_history
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only system can insert lesson history" ON public.lesson_history;
CREATE POLICY "Only system can insert lesson history"
  ON public.lesson_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      -- profile_id: this file postdates 20260731143000_rename_profile_fk_columns.sql,
      -- so user_roles.user_id no longer exists by the time it runs. Corrected
      -- 2026-08-05 to match the live policy on dev and prod, which this file
      -- could never have created as written.
      WHERE user_roles.profile_id = auth.uid() AND user_roles.role = 'admin'::user_role
    )
  );
