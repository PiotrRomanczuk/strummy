-- Migration: Create lesson_songs table
-- PHASE 2, STEP 7

CREATE TABLE lesson_songs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    song_id uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
    status lesson_song_status NOT NULL DEFAULT 'to_learn',
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT lesson_songs_lesson_song_unique UNIQUE (lesson_id, song_id)
);

-- Indexes for quick lookup
CREATE INDEX lesson_songs_lesson_id_idx ON lesson_songs(lesson_id);
CREATE INDEX lesson_songs_song_id_idx ON lesson_songs(song_id);
