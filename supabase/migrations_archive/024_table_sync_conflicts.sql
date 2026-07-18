-- Sync Conflicts Table
-- Stores conflicts between Strummy and Google Calendar for manual resolution

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  google_event_id VARCHAR(255) NOT NULL,
  conflict_data JSONB NOT NULL, -- Stores remote event data
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, resolved, ignored
  resolution VARCHAR(50), -- use_local, use_remote
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_lesson_id ON sync_conflicts(lesson_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status ON sync_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_created_at ON sync_conflicts(created_at DESC);

-- Composite index for finding pending conflicts by teacher
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_status_created
  ON sync_conflicts(status, created_at DESC)
  WHERE status = 'pending';

-- Add constraint to ensure valid status values
ALTER TABLE sync_conflicts
  ADD CONSTRAINT check_sync_conflicts_status
  CHECK (status IN ('pending', 'resolved', 'ignored'));

-- Add constraint to ensure valid resolution values
ALTER TABLE sync_conflicts
  ADD CONSTRAINT check_sync_conflicts_resolution
  CHECK (resolution IS NULL OR resolution IN ('use_local', 'use_remote'));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sync_conflicts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_sync_conflicts_updated_at
  BEFORE UPDATE ON sync_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_conflicts_updated_at();

-- RLS Policies for sync_conflicts
ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;

-- Teachers can view conflicts for their lessons
CREATE POLICY sync_conflicts_select_own ON sync_conflicts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = sync_conflicts.lesson_id
        AND lessons.teacher_id = auth.uid()
    )
  );

-- Teachers can update conflicts for their lessons
CREATE POLICY sync_conflicts_update_own ON sync_conflicts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = sync_conflicts.lesson_id
        AND lessons.teacher_id = auth.uid()
    )
  );

-- System can insert conflicts (via service role)
CREATE POLICY sync_conflicts_insert_system ON sync_conflicts
  FOR INSERT
  WITH CHECK (true);

-- Teachers can delete resolved conflicts for their lessons
CREATE POLICY sync_conflicts_delete_own ON sync_conflicts
  FOR DELETE
  USING (
    status = 'resolved' AND
    EXISTS (
      SELECT 1 FROM lessons
      WHERE lessons.id = sync_conflicts.lesson_id
        AND lessons.teacher_id = auth.uid()
    )
  );

-- Add helpful comments
COMMENT ON TABLE sync_conflicts IS 'Tracks conflicts between Strummy and Google Calendar for manual resolution';
COMMENT ON COLUMN sync_conflicts.lesson_id IS 'Reference to the conflicted lesson';
COMMENT ON COLUMN sync_conflicts.google_event_id IS 'Google Calendar event ID';
COMMENT ON COLUMN sync_conflicts.conflict_data IS 'JSON containing remote event data (title, time, notes, etc.)';
COMMENT ON COLUMN sync_conflicts.status IS 'Conflict status: pending, resolved, or ignored';
COMMENT ON COLUMN sync_conflicts.resolution IS 'How the conflict was resolved: use_local or use_remote';
COMMENT ON COLUMN sync_conflicts.resolved_at IS 'Timestamp when conflict was resolved';
