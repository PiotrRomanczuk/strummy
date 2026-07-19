-- ============================================================================
-- Migration 012: Practice Sessions and Song Progress Tables
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Tracks student practice and song mastery

-- ============================================================================
-- PRACTICE SESSIONS
-- ============================================================================
-- Individual practice session records

CREATE TABLE practice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE SET NULL,

    -- Session details
    duration_minutes SMALLINT NOT NULL CHECK (duration_minutes > 0 AND duration_minutes <= 480),
    notes medium_text,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX ix_practice_sessions_student ON practice_sessions(student_id, created_at DESC);
CREATE INDEX ix_practice_sessions_song ON practice_sessions(song_id) WHERE song_id IS NOT NULL;
CREATE INDEX ix_practice_sessions_date ON practice_sessions(created_at DESC);

-- Trigger
CREATE TRIGGER tr_practice_sessions_updated_at
    BEFORE UPDATE ON practice_sessions
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Comments
COMMENT ON TABLE practice_sessions IS 'Individual practice session records';
COMMENT ON COLUMN practice_sessions.duration_minutes IS 'Practice duration (1-480 minutes)';

-- ============================================================================
-- STUDENT SONG PROGRESS
-- ============================================================================
-- Consolidated view of student progress on each song (across all lessons)

CREATE TABLE student_song_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relationships
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,

    -- Progress tracking
    current_status song_progress_status NOT NULL DEFAULT 'to_learn',
    started_at TIMESTAMPTZ,
    mastered_at TIMESTAMPTZ,

    -- Practice metrics (aggregated from practice_sessions)
    total_practice_minutes INTEGER DEFAULT 0 CHECK (total_practice_minutes >= 0),
    practice_session_count INTEGER DEFAULT 0 CHECK (practice_session_count >= 0),
    last_practiced_at TIMESTAMPTZ,

    -- Notes
    teacher_notes medium_text,
    student_notes medium_text,

    -- Student self-assessment (1-5 difficulty)
    difficulty_rating SMALLINT CHECK (difficulty_rating IS NULL OR (difficulty_rating >= 1 AND difficulty_rating <= 5)),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Each student has one progress record per song
    CONSTRAINT uq_student_song_progress UNIQUE (student_id, song_id)
);

-- Indexes
CREATE INDEX ix_student_song_progress_student ON student_song_progress(student_id);
CREATE INDEX ix_student_song_progress_student_status ON student_song_progress(student_id, current_status);
CREATE INDEX ix_student_song_progress_song ON student_song_progress(song_id);
CREATE INDEX ix_student_song_progress_last_practiced ON student_song_progress(last_practiced_at DESC NULLS LAST);

-- Trigger
CREATE TRIGGER tr_student_song_progress_updated_at
    BEFORE UPDATE ON student_song_progress
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Comments
COMMENT ON TABLE student_song_progress IS 'Consolidated student progress on songs across all lessons';
COMMENT ON COLUMN student_song_progress.current_status IS 'Current mastery level';
COMMENT ON COLUMN student_song_progress.started_at IS 'When student first started learning';
COMMENT ON COLUMN student_song_progress.mastered_at IS 'When student achieved mastered status';
COMMENT ON COLUMN student_song_progress.difficulty_rating IS 'Student self-reported difficulty (1=easy, 5=hard)';
