-- Add youtube_url and gallery_images columns to songs table
ALTER TABLE songs
ADD COLUMN youtube_url text,
ADD COLUMN gallery_images text[];
