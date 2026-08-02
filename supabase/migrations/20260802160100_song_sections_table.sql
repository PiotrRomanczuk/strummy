-- song_sections exists on the dev database (and the RLS policies below with
-- it) but no migration ever created it, so `database.types.ts` generation
-- silently drifted — same gap as lesson_history in the migration just
-- before this one. Formalizes the live schema; every clause is idempotent.
--
-- The four narrower `song_sections_*_policy` policies and the two broader
-- "Admins and teachers ..." / "Authenticated users can select ..." policies
-- overlap (two separate attempts at the same access rule, by different
-- column paths to the same role check). Captured as-is — consolidating them
-- is a separate cleanup, not a schema-drift fix.

CREATE TABLE IF NOT EXISTS public.song_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id uuid NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  section_type text NOT NULL,
  section_number integer NOT NULL DEFAULT 1,
  order_position integer NOT NULL,
  chords text[] NOT NULL DEFAULT '{}',
  lyrics text,
  tab_notation text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT song_sections_section_type_check CHECK (
    section_type = ANY (ARRAY['intro', 'verse', 'pre-chorus', 'chorus', 'bridge', 'solo', 'interlude', 'outro'])
  )
);

CREATE INDEX IF NOT EXISTS idx_song_sections_song_id
  ON public.song_sections (song_id, order_position);

ALTER TABLE public.song_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and teachers can insert/update/delete song_sections" ON public.song_sections;
CREATE POLICY "Admins and teachers can insert/update/delete song_sections"
  ON public.song_sections
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE p.user_id = auth.uid() AND ur.role = ANY (ARRAY['admin'::user_role, 'teacher'::user_role])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.profiles p ON p.id = ur.user_id
      WHERE p.user_id = auth.uid() AND ur.role = ANY (ARRAY['admin'::user_role, 'teacher'::user_role])
    )
  );

DROP POLICY IF EXISTS "Authenticated users can select song_sections" ON public.song_sections;
CREATE POLICY "Authenticated users can select song_sections"
  ON public.song_sections
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "song_sections_select_policy" ON public.song_sections;
CREATE POLICY "song_sections_select_policy"
  ON public.song_sections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.is_teacher = true)
    )
  );

DROP POLICY IF EXISTS "song_sections_insert_policy" ON public.song_sections;
CREATE POLICY "song_sections_insert_policy"
  ON public.song_sections
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.is_teacher = true)
    )
  );

DROP POLICY IF EXISTS "song_sections_update_policy" ON public.song_sections;
CREATE POLICY "song_sections_update_policy"
  ON public.song_sections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.is_teacher = true)
    )
  );

DROP POLICY IF EXISTS "song_sections_delete_policy" ON public.song_sections;
CREATE POLICY "song_sections_delete_policy"
  ON public.song_sections
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND (profiles.is_admin = true OR profiles.is_teacher = true)
    )
  );
