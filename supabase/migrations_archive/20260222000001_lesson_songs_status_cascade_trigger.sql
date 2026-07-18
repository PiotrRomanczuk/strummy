-- ============================================================================
-- Migration: Cascade lesson_songs.status → student_repertoire.current_status
-- Guitar CRM - Sync lesson activity back to the student's repertoire record
-- ============================================================================
-- A BEFORE INSERT OR UPDATE trigger on lesson_songs that:
--   1. Auto-creates a student_repertoire entry if one doesn't exist
--   2. Links lesson_songs.repertoire_id to the repertoire entry
--   3. Advances student_repertoire.current_status forward (never regresses)
--   4. Stamps started_at / mastered_at on status milestones
--
-- Using BEFORE (not AFTER) so we can set NEW.repertoire_id in the same
-- statement without a second round-trip.
-- Using SECURITY DEFINER so the trigger can write student_repertoire
-- regardless of which auth context invokes it.
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_sync_lesson_song_to_repertoire()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id     UUID;
    v_repertoire_id  UUID;
    v_current_status song_progress_status;
    v_new_status     song_progress_status;
    -- array_position is 1-indexed: to_learn=1, started=2, ..., mastered=5
    v_status_order   TEXT[] := ARRAY['to_learn','started','remembered','with_author','mastered'];
    v_new_idx        INT;
    v_cur_idx        INT;
BEGIN
    -- Cast lesson_song_status → song_progress_status (same values, different type names)
    v_new_status := NEW.status::TEXT::song_progress_status;

    -- Look up the student from the parent lesson
    SELECT student_id INTO v_student_id
    FROM lessons
    WHERE id = NEW.lesson_id;

    -- Nothing to sync if lesson has no student (shouldn't happen, but be safe)
    IF v_student_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Ensure a student_repertoire entry exists for this student+song pair
    INSERT INTO student_repertoire (student_id, song_id, current_status)
    VALUES (v_student_id, NEW.song_id, v_new_status)
    ON CONFLICT (student_id, song_id) DO NOTHING;

    -- Fetch the entry (either the one we just created or the pre-existing one)
    SELECT id, current_status
    INTO v_repertoire_id, v_current_status
    FROM student_repertoire
    WHERE student_id = v_student_id AND song_id = NEW.song_id;

    -- Link lesson_songs.repertoire_id if not already set
    IF NEW.repertoire_id IS NULL THEN
        NEW.repertoire_id := v_repertoire_id;
    END IF;

    -- -----------------------------------------------------------------------
    -- Forward-only status cascade
    -- -----------------------------------------------------------------------
    v_new_idx := array_position(v_status_order, NEW.status::TEXT);
    v_cur_idx  := array_position(v_status_order, v_current_status::TEXT);

    IF v_new_idx > v_cur_idx THEN
        UPDATE student_repertoire
        SET
            current_status = v_new_status,
            -- Set started_at the first time the student moves past 'to_learn'
            started_at = CASE
                WHEN v_cur_idx = 1 AND started_at IS NULL THEN now()
                ELSE started_at
            END,
            -- Set mastered_at the first time 'mastered' is reached
            mastered_at = CASE
                WHEN v_new_idx = 5 AND mastered_at IS NULL THEN now()
                ELSE mastered_at
            END
        WHERE id = v_repertoire_id;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION fn_sync_lesson_song_to_repertoire() IS
    'BEFORE trigger: syncs lesson_songs.status changes to student_repertoire. '
    'Auto-creates repertoire entry, links repertoire_id, advances status forward only.';

-- ============================================================================
-- Trigger: fires on INSERT (new song added to a lesson)
-- ============================================================================
DROP TRIGGER IF EXISTS tr_lesson_songs_sync_on_insert ON lesson_songs;

CREATE TRIGGER tr_lesson_songs_sync_on_insert
    BEFORE INSERT ON lesson_songs
    FOR EACH ROW
    EXECUTE FUNCTION fn_sync_lesson_song_to_repertoire();

-- ============================================================================
-- Trigger: fires on UPDATE only when status actually changes
-- ============================================================================
DROP TRIGGER IF EXISTS tr_lesson_songs_sync_on_status_update ON lesson_songs;

CREATE TRIGGER tr_lesson_songs_sync_on_status_update
    BEFORE UPDATE OF status ON lesson_songs
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION fn_sync_lesson_song_to_repertoire();
