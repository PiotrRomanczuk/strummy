-- ============================================================================
-- Migration 024: Storage Bucket Policies
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Supabase Storage policies

-- ============================================================================
-- SONG IMAGES BUCKET
-- ============================================================================

-- Create bucket if it doesn't exist (handled by Supabase dashboard usually)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('song-images', 'song-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload song images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to song images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete song images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update song images" ON storage.objects;

-- Allow authenticated users to upload files to song-images bucket
CREATE POLICY "Authenticated users can upload song images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'song-images');

-- Allow public access to view images (songs can have cover images)
CREATE POLICY "Public Access to song images"
ON storage.objects FOR SELECT
USING (bucket_id = 'song-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update song images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'song-images');

-- Allow authenticated users to delete images
CREATE POLICY "Authenticated users can delete song images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'song-images');

-- ============================================================================
-- AVATAR IMAGES BUCKET
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Public Access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Allow users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view avatars
CREATE POLICY "Public Access to avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow users to update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
