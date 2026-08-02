-- ==============================================================================
-- STRUMMY PRODUCTION CLEANUP SCRIPT (2026-08-01)
-- Resolves Findings: F6, F9, F10
--
-- Instructions: Run this script in the Production Supabase SQL Editor.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- F9: E2E test artifacts in DB
-- ------------------------------------------------------------------------------

-- 1. Delete E2E Lessons and their relations
DELETE FROM lesson_songs 
WHERE lesson_id IN (SELECT id FROM lessons WHERE title LIKE 'E2E Lesson%');

DELETE FROM practice_sessions 
WHERE lesson_id IN (SELECT id FROM lessons WHERE title LIKE 'E2E Lesson%');

DELETE FROM lessons 
WHERE title LIKE 'E2E Lesson%';

-- 2. Delete E2E Songs and their relations
DELETE FROM assignment_songs 
WHERE song_id IN (SELECT id FROM songs WHERE title LIKE 'E2E Song%' OR title LIKE 'Control Song%' OR title LIKE 'UG tab%');

DELETE FROM lesson_songs 
WHERE song_id IN (SELECT id FROM songs WHERE title LIKE 'E2E Song%' OR title LIKE 'Control Song%' OR title LIKE 'UG tab%');

DELETE FROM repertoire 
WHERE song_id IN (SELECT id FROM songs WHERE title LIKE 'E2E Song%' OR title LIKE 'Control Song%' OR title LIKE 'UG tab%');

DELETE FROM song_progress 
WHERE song_id IN (SELECT id FROM songs WHERE title LIKE 'E2E Song%' OR title LIKE 'Control Song%' OR title LIKE 'UG tab%');

DELETE FROM songs 
WHERE title LIKE 'E2E Song%' OR title LIKE 'Control Song%' OR title LIKE 'UG tab%';

-- ------------------------------------------------------------------------------
-- F10: Catalog hygiene (duplicates & missing metadata)
-- ------------------------------------------------------------------------------

-- Remove "Chopin piano sonata" from the guitar catalog
DELETE FROM assignment_songs WHERE song_id IN (SELECT id FROM songs WHERE title ILIKE '%chopin piano sonata%');
DELETE FROM lesson_songs WHERE song_id IN (SELECT id FROM songs WHERE title ILIKE '%chopin piano sonata%');
DELETE FROM repertoire WHERE song_id IN (SELECT id FROM songs WHERE title ILIKE '%chopin piano sonata%');
DELETE FROM song_progress WHERE song_id IN (SELECT id FROM songs WHERE title ILIKE '%chopin piano sonata%');
DELETE FROM songs WHERE title ILIKE '%chopin piano sonata%';

-- Resolve Exact Duplicates (Keep the earliest ID, delete the rest)
WITH duplicates AS (
  SELECT title, MIN(id) as keep_id
  FROM songs
  GROUP BY title
  HAVING COUNT(id) > 1
),
dupe_rows AS (
  SELECT s.id, d.keep_id
  FROM songs s
  JOIN duplicates d ON s.title = d.title
  WHERE s.id != d.keep_id
)
-- Repertoire: Delete if the student already has the keep_id
DELETE FROM repertoire r
USING dupe_rows dr
WHERE r.song_id = dr.id
AND EXISTS (
  SELECT 1 FROM repertoire r2 
  WHERE r2.song_id = dr.keep_id AND r2.student_id = r.student_id
);

WITH duplicates AS (
  SELECT title, MIN(id) as keep_id
  FROM songs
  GROUP BY title
  HAVING COUNT(id) > 1
),
dupe_rows AS (
  SELECT s.id, d.keep_id
  FROM songs s
  JOIN duplicates d ON s.title = d.title
  WHERE s.id != d.keep_id
)
-- Repertoire: Update the remaining ones to keep_id
UPDATE repertoire r
SET song_id = dr.keep_id
FROM dupe_rows dr
WHERE r.song_id = dr.id;

WITH duplicates AS (
  SELECT title, MIN(id) as keep_id
  FROM songs
  GROUP BY title
  HAVING COUNT(id) > 1
),
dupe_rows AS (
  SELECT s.id, d.keep_id
  FROM songs s
  JOIN duplicates d ON s.title = d.title
  WHERE s.id != d.keep_id
)
-- lesson_songs: Delete if lesson already has the keep_id
DELETE FROM lesson_songs ls
USING dupe_rows dr
WHERE ls.song_id = dr.id
AND EXISTS (
  SELECT 1 FROM lesson_songs ls2 
  WHERE ls2.song_id = dr.keep_id AND ls2.lesson_id = ls.lesson_id
);

WITH duplicates AS (
  SELECT title, MIN(id) as keep_id
  FROM songs
  GROUP BY title
  HAVING COUNT(id) > 1
),
dupe_rows AS (
  SELECT s.id, d.keep_id
  FROM songs s
  JOIN duplicates d ON s.title = d.title
  WHERE s.id != d.keep_id
)
-- lesson_songs: Update the remaining ones
UPDATE lesson_songs ls
SET song_id = dr.keep_id
FROM dupe_rows dr
WHERE ls.song_id = dr.id;

WITH duplicates AS (
  SELECT title, MIN(id) as keep_id
  FROM songs
  GROUP BY title
  HAVING COUNT(id) > 1
),
dupe_rows AS (
  SELECT s.id, d.keep_id
  FROM songs s
  JOIN duplicates d ON s.title = d.title
  WHERE s.id != d.keep_id
)
-- Now delete the duplicate songs
DELETE FROM songs
WHERE id IN (SELECT id FROM dupe_rows);

-- Fix Can't vs Cant Help Falling In Love manually
WITH target AS (
  SELECT MIN(id) as keep_id FROM songs WHERE title ILIKE 'can%t help falling in love'
),
todelete AS (
  SELECT id FROM songs WHERE title ILIKE 'can%t help falling in love' AND id NOT IN (SELECT keep_id FROM target)
)
DELETE FROM songs WHERE id IN (SELECT id FROM todelete);


-- ------------------------------------------------------------------------------
-- F6: Lesson Sequence Numbers chronological fix
-- ------------------------------------------------------------------------------

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER(PARTITION BY teacher_id, student_id ORDER BY scheduled_at ASC) as rn
  FROM lessons
)
UPDATE lessons 
SET lesson_teacher_number = numbered.rn 
FROM numbered 
WHERE lessons.id = numbered.id
AND lessons.lesson_teacher_number != numbered.rn;

-- ------------------------------------------------------------------------------
-- F11: Song Requests and Song of the Week E2E test artifacts
-- ------------------------------------------------------------------------------
DELETE FROM song_requests
WHERE title LIKE 'E2E Test Song Request%';

DELETE FROM song_of_the_week
WHERE teacher_message = 'This is a great song for practicing strumming patterns!';

COMMIT;
