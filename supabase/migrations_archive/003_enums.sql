-- ============================================================================
-- Migration 003: Enum Types
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- All enum types in one place for easy maintenance

-- User roles (used in profiles boolean flags)
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');

-- Song difficulty levels
CREATE TYPE difficulty_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Musical keys (major and minor, including enharmonic equivalents)
CREATE TYPE music_key AS ENUM (
    -- Major keys
    'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
    -- Minor keys
    'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bbm', 'Bm'
);

-- Lesson status workflow: SCHEDULED -> IN_PROGRESS -> COMPLETED/CANCELLED/RESCHEDULED
CREATE TYPE lesson_status AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'RESCHEDULED'
);

-- Song learning progress within lessons
-- Linear progression: to_learn -> started -> remembered -> with_author -> mastered
CREATE TYPE song_progress_status AS ENUM (
    'to_learn',
    'started',
    'remembered',
    'with_author',
    'mastered'
);

-- Assignment status workflow
CREATE TYPE assignment_status AS ENUM (
    'not_started',
    'pending',
    'in_progress',
    'completed',
    'overdue',
    'cancelled'
);

-- Student pipeline stages
CREATE TYPE student_pipeline_status AS ENUM (
    'lead',
    'trial',
    'active',
    'inactive',
    'churned'
);

-- Audit log action types
CREATE TYPE audit_action AS ENUM (
    'created',
    'updated',
    'deleted',
    'status_changed',
    'rescheduled',
    'cancelled',
    'completed',
    'role_changed'
);

-- Audit log entity types
CREATE TYPE audit_entity AS ENUM (
    'profile',
    'lesson',
    'assignment',
    'song',
    'song_progress'
);

-- Spotify match review status
CREATE TYPE spotify_match_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'auto_applied'
);

-- AI conversation context types
CREATE TYPE ai_context_type AS ENUM (
    'general',
    'student',
    'lesson',
    'song',
    'assignment',
    'practice'
);

-- AI message roles
CREATE TYPE ai_message_role AS ENUM (
    'system',
    'user',
    'assistant'
);

-- AI prompt template categories
CREATE TYPE ai_prompt_category AS ENUM (
    'email',
    'lesson_notes',
    'practice_plan',
    'progress_report',
    'feedback',
    'reminder',
    'custom'
);

-- Comments
COMMENT ON TYPE user_role IS 'Available user roles in the system';
COMMENT ON TYPE difficulty_level IS 'Song difficulty classification';
COMMENT ON TYPE music_key IS 'Musical keys including major and minor variants';
COMMENT ON TYPE lesson_status IS 'Lesson workflow states';
COMMENT ON TYPE song_progress_status IS 'Linear song learning progression (no backwards movement)';
COMMENT ON TYPE assignment_status IS 'Assignment workflow states';
COMMENT ON TYPE student_pipeline_status IS 'Student lifecycle stages';
COMMENT ON TYPE audit_action IS 'Types of actions tracked in audit log';
COMMENT ON TYPE audit_entity IS 'Entity types tracked in audit log';
