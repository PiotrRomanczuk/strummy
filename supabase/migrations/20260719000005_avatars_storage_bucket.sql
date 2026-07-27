-- Migration: avatars storage bucket + policies (IDA-2)
-- ============================================================================
-- Blueprint gap IDA-2 (docs/app-blueprint/01-identity-access.md).
--
-- GUARDED (2026-07-27): the whole body is skipped with a NOTICE when the
-- `storage` schema is not provisioned (e.g. a stack without the storage-api
-- container), so the migration chain replays linearly everywhere instead of
-- hard-failing — the original file had to be hand-skipped on such stacks.
-- Policies are dropped before create, making re-application safe. Semantics
-- are unchanged: on storage-less stacks nothing happens; re-apply once
-- storage exists (StudentProduction, Cloud).
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN
    RAISE NOTICE 'storage schema absent — skipping avatars bucket + policies';
    RETURN;
  END IF;

  EXECUTE $sql$
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'avatars',
      'avatars',
      true,
      2097152, -- 2 MB, mirrors lib/storage/avatar.ts's MAX_AVATAR_BYTES
      ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    )
    ON CONFLICT (id) DO NOTHING
  $sql$;

  -- Public read: avatars are meant to be visible to anyone (profile pictures).
  EXECUTE 'DROP POLICY IF EXISTS avatars_public_read ON storage.objects';
  EXECUTE $sql$
    CREATE POLICY avatars_public_read ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'avatars')
  $sql$;

  -- Owner-write: a user may only write/overwrite objects under their own
  -- user-id-prefixed path (lib/storage/avatar.ts's avatarObjectPath ensures
  -- uploads always go to `${userId}/avatar.<ext>`), so this also satisfies
  -- "another user cannot overwrite my object" without a separate ownership
  -- column on storage.objects. NOTE: storage paths are keyed by AUTH uid —
  -- one of the few legitimately auth-uid-space comparisons (see
  -- 20260727130000's header).
  EXECUTE 'DROP POLICY IF EXISTS avatars_owner_write ON storage.objects';
  EXECUTE $sql$
    CREATE POLICY avatars_owner_write ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = (select auth.uid())::text
      )
  $sql$;

  EXECUTE 'DROP POLICY IF EXISTS avatars_owner_update ON storage.objects';
  EXECUTE $sql$
    CREATE POLICY avatars_owner_update ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text)
      WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text)
  $sql$;

  EXECUTE 'DROP POLICY IF EXISTS avatars_owner_delete ON storage.objects';
  EXECUTE $sql$
    CREATE POLICY avatars_owner_delete ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text)
  $sql$;
END $$;
