-- Migration: Create song_of_the_week table
-- Allows admins to spotlight a single song each week for students to learn

CREATE TABLE song_of_the_week (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id     UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  selected_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  teacher_message TEXT,
  active_from DATE NOT NULL DEFAULT CURRENT_DATE,
  active_until DATE,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce exactly one active SOTW at a time
CREATE UNIQUE INDEX uq_sotw_active ON song_of_the_week (is_active) WHERE is_active = true;
CREATE INDEX ix_sotw_song_id ON song_of_the_week(song_id);
CREATE INDEX ix_sotw_active_from ON song_of_the_week(active_from DESC);

-- Enable RLS
ALTER TABLE song_of_the_week ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view
CREATE POLICY "Authenticated users can view SOTW"
  ON song_of_the_week FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only admins can insert
CREATE POLICY "Admins can insert SOTW"
  ON song_of_the_week FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Only admins can update
CREATE POLICY "Admins can update SOTW"
  ON song_of_the_week FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Only admins can delete
CREATE POLICY "Admins can delete SOTW"
  ON song_of_the_week FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Auto-update updated_at trigger
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON song_of_the_week
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
