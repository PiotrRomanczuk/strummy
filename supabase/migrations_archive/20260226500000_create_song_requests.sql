-- Song Request Workflow
-- Students can request songs they want to learn.
-- Teachers/admins review, approve, or reject requests.

CREATE TABLE song_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    artist TEXT,
    notes TEXT,
    url TEXT,  -- YouTube/Spotify link for reference
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES profiles(id),
    review_notes TEXT,
    song_id UUID REFERENCES songs(id),  -- linked song if approved and created
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_song_requests_student_id ON song_requests(student_id);
CREATE INDEX ix_song_requests_status ON song_requests(status);

ALTER TABLE song_requests ENABLE ROW LEVEL SECURITY;

-- Students can read their own requests
CREATE POLICY "Students can read own requests"
    ON song_requests FOR SELECT
    USING (auth.uid() = student_id);

-- Students can create requests (only for themselves)
CREATE POLICY "Students can create requests"
    ON song_requests FOR INSERT
    WITH CHECK (auth.uid() = student_id);

-- Teachers/admins can read all requests
CREATE POLICY "Teachers can read all requests"
    ON song_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_teacher = true OR profiles.is_admin = true)
        )
    );

-- Teachers/admins can update requests (review)
CREATE POLICY "Teachers can update requests"
    ON song_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (profiles.is_teacher = true OR profiles.is_admin = true)
        )
    );

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_song_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_song_requests_updated_at
    BEFORE UPDATE ON song_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_song_requests_updated_at();
