-- Migration: Create songs table
-- PHASE 2, STEP 5

CREATE TABLE songs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    author text NOT NULL,
    level difficulty_level NOT NULL,
    key music_key NOT NULL,
    ultimate_guitar_link text NOT NULL,
    chords text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for quick lookup
CREATE INDEX songs_title_idx ON songs(title);
CREATE INDEX songs_author_idx ON songs(author);
