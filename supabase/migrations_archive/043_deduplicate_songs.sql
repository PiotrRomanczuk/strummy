-- ============================================================
-- Migration: Deduplicate songs & add unique constraint
-- ============================================================

-- Step 1: Copy ultimate_guitar_link from old "Unknown" entries to kept entries
UPDATE songs AS kept
SET ultimate_guitar_link = old.ultimate_guitar_link
FROM songs AS old
WHERE old.author = 'Unknown'
  AND old.deleted_at IS NULL
  AND old.ultimate_guitar_link IS NOT NULL
  AND kept.author != 'Unknown'
  AND kept.deleted_at IS NULL
  AND kept.ultimate_guitar_link IS NULL
  AND LOWER(TRIM(kept.title)) = LOWER(TRIM(old.title))
  AND old.id IN (
    '9a53ebf1-4787-417e-8226-e6ffab6e461c',
    'bec19d4c-8417-43ff-976f-6bcbde59298d',
    'f5631a4e-84c5-4ce4-9c54-19e2e2c2689d',
    'b36e1af1-ec93-4837-ac2c-e06269bb88b7',
    '610c102c-766b-49d2-ac19-432a8fbced30',
    '9b5e9c50-c178-4853-b6cb-d34eb3c711d2',
    'f32a265b-29aa-48d8-89be-f8fef26903c6',
    'd671ebc4-9fed-4c83-9a3b-b703ff0e691e',
    'e92c4e5e-db16-40ca-b8df-f9342a668961',
    'b048944a-928f-4624-9a87-c3f00aa498ac'
  );

-- Step 2: Soft-delete the 10 "Unknown" author duplicates
UPDATE songs
SET deleted_at = now()
WHERE id IN (
  '9a53ebf1-4787-417e-8226-e6ffab6e461c',
  'bec19d4c-8417-43ff-976f-6bcbde59298d',
  'f5631a4e-84c5-4ce4-9c54-19e2e2c2689d',
  'b36e1af1-ec93-4837-ac2c-e06269bb88b7',
  '610c102c-766b-49d2-ac19-432a8fbced30',
  '9b5e9c50-c178-4853-b6cb-d34eb3c711d2',
  'f32a265b-29aa-48d8-89be-f8fef26903c6',
  'd671ebc4-9fed-4c83-9a3b-b703ff0e691e',
  'e92c4e5e-db16-40ca-b8df-f9342a668961',
  'b048944a-928f-4624-9a87-c3f00aa498ac'
)
AND deleted_at IS NULL;

-- Step 3: Soft-delete the "Zanim Pojde " entry with trailing space
UPDATE songs
SET deleted_at = now()
WHERE id = '108af0ae-7c17-41c4-859c-30eec4c5b80a'
AND deleted_at IS NULL;

-- Step 4: Add partial unique index on normalized title + author for active songs only
CREATE UNIQUE INDEX uix_songs_title_author_active
ON songs (LOWER(TRIM(title)), LOWER(TRIM(COALESCE(author, ''))))
WHERE deleted_at IS NULL;
