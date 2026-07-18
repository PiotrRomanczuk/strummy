-- Migration: Create all required enums
-- PHASE 1, STEP 2

CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');

CREATE TYPE music_key AS ENUM (
	'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
	'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bbm', 'Bm'
);

CREATE TYPE lesson_song_status AS ENUM ('to_learn', 'started', 'remembered', 'with_author', 'mastered');

-- Lesson status enum
CREATE TYPE lesson_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RESCHEDULED');

-- Task priority enum
CREATE TYPE task_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- Task status enum
CREATE TYPE task_status AS ENUM ('OPEN', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED', 'CANCELLED', 'BLOCKED');

-- User role enum (if needed for reference)
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');

-- Add other enums as needed
