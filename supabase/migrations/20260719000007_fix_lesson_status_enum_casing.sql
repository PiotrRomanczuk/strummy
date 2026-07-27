-- ============================================================================
-- Migration: Fix lesson_status enum casing drift
-- Date: 2026-07-19
-- ============================================================================
-- Every migration that creates lesson_status (003_enums.sql,
-- 20251107121500_create_enums.sql) and every write-side consumer
-- (schemas/LessonSchema.ts's LessonStatusEnum, LessonForm.Fields.tsx's
-- status dropdown, app/actions/lesson-edit.ts, app/dashboard/lessons/
-- recurring-actions.ts) use uppercase values ('SCHEDULED', 'IN_PROGRESS',
-- 'COMPLETED', 'CANCELLED'). This local dev database's actual enum had
-- drifted to lowercase out-of-band — no migration in this repo ever created
-- lowercase labels — silently breaking every lesson insert/update on this
-- environment (masked in tests because the mocked-Supabase Jest suites
-- never touch the real enum, and only a couple of read/display call sites
-- — lib/services/lessons-queries.ts's STATUS_LABELS/STATUS_COLOURS,
-- app/dashboard/lessons/page.tsx's STATUS_KEYS — were ever patched
-- defensively to also accept lowercase).
--
-- RENAME VALUE is metadata-only: existing rows keep the same underlying
-- enum OID, so this is a zero-downtime, zero-data-loss, instant rename
-- that brings the enum back in line with every migration and every
-- write-side consumer in the repo. The lowercase branches in the
-- display-layer maps above are left in place as a harmless no-op fallback
-- rather than touched here (out of scope for this fix).
-- ============================================================================

-- GUARDED (2026-07-27): each rename only fires while the lowercase label
-- still exists, so the file is idempotent and replays cleanly on stacks
-- already carrying the uppercase labels (fresh chains included).
DO $$
DECLARE
  pair record;
BEGIN
  FOR pair IN
    SELECT * FROM (VALUES
      ('scheduled',   'SCHEDULED'),
      ('in_progress', 'IN_PROGRESS'),
      ('completed',   'COMPLETED'),
      ('cancelled',   'CANCELLED')
    ) AS v(lower_label, upper_label)
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'lesson_status' AND e.enumlabel = pair.lower_label
    ) THEN
      EXECUTE format('ALTER TYPE lesson_status RENAME VALUE %L TO %L',
                     pair.lower_label, pair.upper_label);
    END IF;
  END LOOP;
END $$;
