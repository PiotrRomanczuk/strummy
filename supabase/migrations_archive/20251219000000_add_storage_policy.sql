-- Allow authenticated users to upload files to the song-images bucket
create policy "Authenticated users can upload song images"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'song-images' );

-- Allow public access to view images (select)
create policy "Public Access to song images"
on storage.objects for select
using ( bucket_id = 'song-images' );

-- Allow authenticated users to delete their own images (optional, but useful)
-- For now, let's allow them to delete any image in this bucket since it's a shared resource for admins/teachers
create policy "Authenticated users can delete song images"
on storage.objects for delete
to authenticated
using ( bucket_id = 'song-images' );
