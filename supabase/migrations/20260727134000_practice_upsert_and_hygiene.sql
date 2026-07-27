-- Migration: practice aggregation upsert + index/constraint hygiene
-- ============================================================================
-- Date: 2026-07-27. Implements finding 9 and the index/constraint items from
-- the "Low" list of docs/analysis/2026-07-27-migrations-architecture-review.md.
--
-- DEPENDENCY: references baseline-only tables (practice_sessions,
-- student_repertoire) unguarded — same doctrine as 20260727130000: all real
-- stacks have them, and fresh `db reset` replay is covered by the pre-chain
-- baseline migration in this same PR.
-- ============================================================================

-- ============================================================================
-- SECTION 1: fn_aggregate_practice_to_repertoire — stop dropping sessions
-- ============================================================================
-- The AFTER INSERT aggregation (20260718210000, search_path pinned in
-- 20260727100000 §8) only UPDATEd an existing student_repertoire row: a
-- session logged for a song not (yet) in the student's repertoire silently
-- vanished from the aggregates. Now upserts: self-directed practice creates
-- the repertoire row (current_status defaults to 'to_learn').
-- ON CONFLICT rides uq_student_repertoire (student_id, song_id) — verified
-- present live with zero duplicate pairs; created here if absent for replay.

CREATE UNIQUE INDEX IF NOT EXISTS uq_student_repertoire
  ON public.student_repertoire (student_id, song_id);

CREATE OR REPLACE FUNCTION public.fn_aggregate_practice_to_repertoire()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only aggregate when the session is linked to a specific song
    IF NEW.song_id IS NOT NULL THEN
        INSERT INTO public.student_repertoire (
            student_id, song_id,
            total_practice_minutes, practice_session_count, last_practiced_at
        )
        VALUES (
            NEW.student_id, NEW.song_id,
            NEW.duration_minutes, 1, NEW.created_at
        )
        ON CONFLICT (student_id, song_id) DO UPDATE SET
            total_practice_minutes =
                student_repertoire.total_practice_minutes + EXCLUDED.total_practice_minutes,
            practice_session_count = student_repertoire.practice_session_count + 1,
            last_practiced_at = GREATEST(
                COALESCE(student_repertoire.last_practiced_at, EXCLUDED.last_practiced_at),
                EXCLUDED.last_practiced_at
            );
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_aggregate_practice_to_repertoire() IS
    'AFTER INSERT trigger function: upserts practice metrics into '
    'student_repertoire. Since 2026-07-27 (finding 9) a session for a song '
    'not yet in the repertoire CREATES the row (status defaults to to_learn) '
    'instead of silently dropping the minutes.';

-- ============================================================================
-- SECTION 2: index hygiene
-- ============================================================================
-- Redundant (covered by a unique constraint/index on the same leading col):
DROP INDEX IF EXISTS public.ix_lesson_songs_lesson;          -- unique(lesson_id, song_id)
DROP INDEX IF EXISTS public.idx_teacher_settings_profile_id; -- unique(profile_id)
-- Near-zero selectivity (2-value enum):
DROP INDEX IF EXISTS public.idx_profiles_student_status;

-- Lessons list queries filter by participant and ORDER BY scheduled_at
-- (lib/services/lessons-queries.ts) — replace the bare FK indexes with
-- composites that serve both the filter and the sort.
DROP INDEX IF EXISTS public.ix_lessons_teacher;
CREATE INDEX IF NOT EXISTS ix_lessons_teacher_scheduled
  ON public.lessons (teacher_id, scheduled_at) WHERE deleted_at IS NULL;

DROP INDEX IF EXISTS public.ix_lessons_student;
CREATE INDEX IF NOT EXISTS ix_lessons_student_scheduled
  ON public.lessons (student_id, scheduled_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- SECTION 3: assignment_history.change_type CHECK
-- ============================================================================
-- The trigger writes exactly these two values (verified: no others live).
ALTER TABLE public.assignment_history
  DROP CONSTRAINT IF EXISTS assignment_history_change_type_check;
ALTER TABLE public.assignment_history
  ADD CONSTRAINT assignment_history_change_type_check
  CHECK (change_type IN ('created', 'status_changed'));
