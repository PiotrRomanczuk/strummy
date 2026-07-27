-- Migration: song-covers storage bucket + policies
-- ============================================================================
-- Manual cover-image upload for the editorial song forms. Mirrors the avatars
-- bucket (supabase/migrations/20260719000005_avatars_storage_bucket.sql) but
-- songs are catalog entities, not user-owned rows — so write access is gated on
-- role (public.is_admin() OR public.is_teacher()) rather than an auth.uid()
-- folder convention. Any admin/teacher may add or replace any cover.
--
-- GUARDED (2026-07-27): skipped with a NOTICE where the `storage` schema is
-- absent (StudentDevelopment has no storage-api container) so the chain
-- replays linearly everywhere; semantics unchanged. On stacks without Storage
-- the uploader button is hidden via NEXT_PUBLIC_SONG_COVER_UPLOAD_ENABLED=false
-- and manual URL entry remains.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NULL THEN
    RAISE NOTICE 'storage schema absent — skipping song-covers bucket + policies';
    RETURN;
  END IF;

  EXECUTE $sql$
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'song-covers',
      'song-covers',
      true,
      2097152, -- 2 MB, mirrors lib/storage/songCover.ts's MAX_SONG_COVER_BYTES
      ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    )
    ON CONFLICT (id) DO NOTHING
  $sql$;

  -- Public read: covers are shown in the songs catalog to everyone.
  EXECUTE 'DROP POLICY IF EXISTS song_covers_public_read ON storage.objects';
  EXECUTE $sql$
    CREATE POLICY song_covers_public_read ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'song-covers')
  $sql$;

  -- Role-gated writes: only admins and teachers may add/replace/remove covers.
  EXECUTE 'DROP POLICY IF EXISTS song_covers_staff_insert ON storage.objects';
  EXECUTE $sql$
    CREATE POLICY song_covers_staff_insert ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'song-covers'
        AND (select public.is_admin_or_teacher())
      )
  $sql$;

  EXECUTE 'DROP POLICY IF EXISTS song_covers_staff_update ON storage.objects';
  EXECUTE $sql$
    CREATE POLICY song_covers_staff_update ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (bucket_id = 'song-covers' AND (select public.is_admin_or_teacher()))
      WITH CHECK (bucket_id = 'song-covers' AND (select public.is_admin_or_teacher()))
  $sql$;

  EXECUTE 'DROP POLICY IF EXISTS song_covers_staff_delete ON storage.objects';
  EXECUTE $sql$
    CREATE POLICY song_covers_staff_delete ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'song-covers' AND (select public.is_admin_or_teacher()))
  $sql$;
END $$;
