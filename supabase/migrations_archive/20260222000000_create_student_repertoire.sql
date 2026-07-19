-- ============================================================================
-- Migration: Student Repertoire Table
-- Guitar CRM - Direct student-to-song relationship with per-student config
-- ============================================================================
-- Creates the student_repertoire table which represents "this student is
-- learning/has learned this song" with student-specific configuration.
-- This is the single source of truth for student song progress,
-- replacing the indirect derivation from lesson_songs.

-- ============================================================================
-- TABLE: student_repertoire
-- ============================================================================

CREATE TABLE student_repertoire (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core relationship
    student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,

    -- Student-specific song configuration (overrides global song defaults)
    preferred_key music_key,
    capo_fret SMALLINT CHECK (capo_fret IS NULL OR (capo_fret >= 0 AND capo_fret <= 20)),
    custom_strumming VARCHAR(255),
    student_notes TEXT,
    teacher_notes TEXT,

    -- Progress tracking (single source of truth)
    current_status song_progress_status NOT NULL DEFAULT 'to_learn',
    started_at TIMESTAMPTZ,
    mastered_at TIMESTAMPTZ,
    difficulty_rating SMALLINT CHECK (difficulty_rating IS NULL OR (difficulty_rating >= 1 AND difficulty_rating <= 5)),

    -- Practice metrics (aggregated)
    total_practice_minutes INTEGER DEFAULT 0 CHECK (total_practice_minutes >= 0),
    practice_session_count INTEGER DEFAULT 0 CHECK (practice_session_count >= 0),
    last_practiced_at TIMESTAMPTZ,

    -- Repertoire management
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    priority VARCHAR(20) DEFAULT 'normal'
        CHECK (priority IN ('high', 'normal', 'low', 'archived')),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Each student has one repertoire entry per song
    CONSTRAINT uq_student_repertoire UNIQUE (student_id, song_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX ix_student_repertoire_student ON student_repertoire(student_id);
CREATE INDEX ix_student_repertoire_student_active ON student_repertoire(student_id, is_active)
    WHERE is_active = true;
CREATE INDEX ix_student_repertoire_student_status ON student_repertoire(student_id, current_status);
CREATE INDEX ix_student_repertoire_song ON student_repertoire(song_id);
CREATE INDEX ix_student_repertoire_priority ON student_repertoire(student_id, priority, sort_order);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER tr_student_repertoire_updated_at
    BEFORE UPDATE ON student_repertoire
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE student_repertoire ENABLE ROW LEVEL SECURITY;

-- Students can view their own repertoire
CREATE POLICY sr_select_own ON student_repertoire
    FOR SELECT USING (student_id = auth.uid());

-- Admins and teachers can view all repertoire
CREATE POLICY sr_select_admin_teacher ON student_repertoire
    FOR SELECT USING (is_admin_or_teacher());

-- Admins and teachers can insert repertoire entries
CREATE POLICY sr_insert_admin_teacher ON student_repertoire
    FOR INSERT WITH CHECK (is_admin_or_teacher());

-- Admins and teachers can update all fields
CREATE POLICY sr_update_admin_teacher ON student_repertoire
    FOR UPDATE USING (is_admin_or_teacher());

-- Students can update their own notes and difficulty rating only
CREATE POLICY sr_update_own_notes ON student_repertoire
    FOR UPDATE USING (student_id = auth.uid())
    WITH CHECK (student_id = auth.uid());

-- Admins and teachers can delete repertoire entries
CREATE POLICY sr_delete_admin_teacher ON student_repertoire
    FOR DELETE USING (is_admin_or_teacher());

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON student_repertoire TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE student_repertoire IS 'Direct student-to-song relationship with per-student configuration and progress tracking';
COMMENT ON COLUMN student_repertoire.preferred_key IS 'Student plays this song in a different key than the global default';
COMMENT ON COLUMN student_repertoire.capo_fret IS 'Student-specific capo position (0-20)';
COMMENT ON COLUMN student_repertoire.custom_strumming IS 'Student-specific strumming pattern override';
COMMENT ON COLUMN student_repertoire.current_status IS 'Song learning progress: to_learn -> started -> remembered -> with_author -> mastered';
COMMENT ON COLUMN student_repertoire.started_at IS 'When the student first started learning this song';
COMMENT ON COLUMN student_repertoire.mastered_at IS 'When the student achieved mastered status';
COMMENT ON COLUMN student_repertoire.difficulty_rating IS 'Student self-reported difficulty (1=easy, 5=hard)';
COMMENT ON COLUMN student_repertoire.assigned_by IS 'Teacher who added this song to the student repertoire';
COMMENT ON COLUMN student_repertoire.sort_order IS 'Custom ordering within priority group';
COMMENT ON COLUMN student_repertoire.is_active IS 'Whether this song is in the active practice rotation';
COMMENT ON COLUMN student_repertoire.priority IS 'Repertoire priority: high, normal, low, or archived';

-- ============================================================================
-- DATA MIGRATION: Backfill from student_song_progress
-- ============================================================================

INSERT INTO student_repertoire (
    student_id, song_id, current_status,
    started_at, mastered_at,
    total_practice_minutes, practice_session_count, last_practiced_at,
    teacher_notes, student_notes, difficulty_rating,
    created_at, updated_at
)
SELECT
    ssp.student_id, ssp.song_id, ssp.current_status,
    ssp.started_at, ssp.mastered_at,
    ssp.total_practice_minutes, ssp.practice_session_count, ssp.last_practiced_at,
    ssp.teacher_notes, ssp.student_notes, ssp.difficulty_rating,
    ssp.created_at, ssp.updated_at
FROM student_song_progress ssp
ON CONFLICT (student_id, song_id) DO NOTHING;

-- ============================================================================
-- DATA MIGRATION: Backfill from lesson_songs for any pairs not already covered
-- ============================================================================

INSERT INTO student_repertoire (student_id, song_id, current_status, created_at)
SELECT DISTINCT
    l.student_id,
    ls.song_id,
    ls.status,
    ls.created_at
FROM lesson_songs ls
JOIN lessons l ON l.id = ls.lesson_id
WHERE l.student_id IS NOT NULL
ON CONFLICT (student_id, song_id) DO NOTHING;

-- ============================================================================
-- ADD repertoire_id COLUMN TO lesson_songs
-- ============================================================================

ALTER TABLE lesson_songs
    ADD COLUMN repertoire_id UUID REFERENCES student_repertoire(id) ON DELETE SET NULL;

CREATE INDEX ix_lesson_songs_repertoire ON lesson_songs(repertoire_id)
    WHERE repertoire_id IS NOT NULL;

COMMENT ON COLUMN lesson_songs.repertoire_id IS 'Links to student_repertoire entry for this student+song pair';

-- ============================================================================
-- BACKFILL lesson_songs.repertoire_id
-- ============================================================================

UPDATE lesson_songs ls
SET repertoire_id = sr.id
FROM lessons l
JOIN student_repertoire sr ON sr.student_id = l.student_id AND sr.song_id = ls.song_id
WHERE ls.lesson_id = l.id
  AND ls.repertoire_id IS NULL;
