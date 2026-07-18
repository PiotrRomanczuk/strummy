-- Migration: Create user_preferences table for onboarding data persistence
-- Stores learning goals, skill level, learning style, and instrument preferences
-- collected during the onboarding flow.

CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    goals TEXT[] NOT NULL DEFAULT '{}',
    skill_level TEXT NOT NULL DEFAULT 'beginner'
        CHECK (skill_level IN ('beginner', 'intermediate', 'advanced')),
    learning_style TEXT[] NOT NULL DEFAULT '{}',
    instrument_preference TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

CREATE INDEX ix_user_preferences_user_id ON user_preferences(user_id);

-- RLS: Users can only read/write their own preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own preferences"
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admin can read all preferences (for analytics/reporting)
CREATE POLICY "Admins can read all preferences"
    ON user_preferences FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );

COMMENT ON TABLE user_preferences IS 'Stores user onboarding preferences: goals, skill level, learning style, instruments';
COMMENT ON COLUMN user_preferences.goals IS 'Array of learning goal IDs selected during onboarding';
COMMENT ON COLUMN user_preferences.skill_level IS 'Self-assessed skill level: beginner, intermediate, advanced';
COMMENT ON COLUMN user_preferences.learning_style IS 'Preferred learning methods: video, sheet-music, tabs, all';
COMMENT ON COLUMN user_preferences.instrument_preference IS 'Preferred instrument types: acoustic, electric, classical, bass';
