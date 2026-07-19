-- ============================================================================
-- Migration 026: Seed Data
-- Guitar CRM - Optimized Schema v2
-- ============================================================================
-- Initial seed data for development and testing
-- NOTE: This should only run in development environments

-- ============================================================================
-- SAMPLE SONGS (No auth dependency)
-- ============================================================================

INSERT INTO songs (id, title, author, level, key, tempo, time_signature, category)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Wonderwall', 'Oasis', 'beginner', 'Em', 87, 4, 'Rock'),
    ('a0000000-0000-0000-0000-000000000002', 'Hotel California', 'Eagles', 'intermediate', 'Bm', 74, 4, 'Rock'),
    ('a0000000-0000-0000-0000-000000000003', 'Wish You Were Here', 'Pink Floyd', 'beginner', 'G', 62, 4, 'Rock'),
    ('a0000000-0000-0000-0000-000000000004', 'Blackbird', 'The Beatles', 'advanced', 'G', 94, 4, 'Folk'),
    ('a0000000-0000-0000-0000-000000000005', 'Hallelujah', 'Leonard Cohen', 'intermediate', 'C', 56, 4, 'Folk'),
    ('a0000000-0000-0000-0000-000000000006', 'Nothing Else Matters', 'Metallica', 'intermediate', 'Em', 69, 4, 'Metal'),
    ('a0000000-0000-0000-0000-000000000007', 'Stairway to Heaven', 'Led Zeppelin', 'advanced', 'Am', 82, 4, 'Rock'),
    ('a0000000-0000-0000-0000-000000000008', 'Hey There Delilah', 'Plain White T''s', 'beginner', 'D', 108, 4, 'Pop'),
    ('a0000000-0000-0000-0000-000000000009', 'Dust in the Wind', 'Kansas', 'intermediate', 'Am', 94, 4, 'Rock'),
    ('a0000000-0000-0000-0000-000000000010', 'Fast Car', 'Tracy Chapman', 'intermediate', 'C', 104, 4, 'Folk')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SYSTEM AI PROMPT TEMPLATES
-- ============================================================================

INSERT INTO ai_prompt_templates (id, name, description, category, prompt_template, variables, is_system, is_active)
VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        'Lesson Summary',
        'Generate a summary of the lesson for the student',
        'lesson_notes',
        'Please summarize the following guitar lesson for the student {{student_name}}:

Lesson Date: {{lesson_date}}
Songs Covered: {{songs}}
Notes: {{notes}}

Provide a friendly summary highlighting:
1. What was accomplished
2. Areas that need practice
3. Encouragement for next steps',
        '["student_name", "lesson_date", "songs", "notes"]',
        true,
        true
    ),
    (
        'b0000000-0000-0000-0000-000000000002',
        'Practice Plan',
        'Generate a weekly practice plan for a student',
        'practice_plan',
        'Create a practice plan for {{student_name}} based on their current progress:

Current Level: {{level}}
Songs in Progress: {{songs}}
Practice Time Available: {{time_per_day}} minutes per day

Generate a structured daily practice plan for the week that includes:
1. Warm-up exercises
2. Song practice with specific focus areas
3. Technical exercises
4. Cool-down and review',
        '["student_name", "level", "songs", "time_per_day"]',
        true,
        true
    ),
    (
        'b0000000-0000-0000-0000-000000000003',
        'Progress Report',
        'Generate a progress report for a student',
        'progress_report',
        'Generate a progress report for {{student_name}}:

Period: {{start_date}} to {{end_date}}
Lessons Completed: {{lesson_count}}
Songs Mastered: {{songs_mastered}}
Current Songs: {{current_songs}}

Create an encouraging progress report that:
1. Celebrates achievements
2. Notes areas of improvement
3. Sets goals for the next period',
        '["student_name", "start_date", "end_date", "lesson_count", "songs_mastered", "current_songs"]',
        true,
        true
    ),
    (
        'b0000000-0000-0000-0000-000000000004',
        'Lesson Reminder',
        'Send a reminder about an upcoming lesson',
        'reminder',
        'Generate a friendly reminder for {{student_name}} about their upcoming lesson:

Lesson Date: {{lesson_date}}
Time: {{lesson_time}}
Songs to Review: {{songs}}

Include:
1. Friendly greeting
2. Reminder of what to practice before the lesson
3. Any materials to bring',
        '["student_name", "lesson_date", "lesson_time", "songs"]',
        true,
        true
    )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- NOTE: User profiles are created via auth.users trigger
-- Development users should be created via Supabase Auth or the seed script
-- ============================================================================

-- Example of how to add admin role to a user (after they're created via Auth):
-- UPDATE profiles SET is_admin = true WHERE email = 'admin@example.com';
