-- Migration: Seed initial data (enums, sample users, songs, etc.)
-- PHASE 6, STEP 17

-- Seed profiles first (required for foreign keys)
INSERT INTO profiles (id, email, full_name, is_admin, is_teacher, is_student) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@guitcrm.test', 'Admin User', true, false, false),
('22222222-2222-2222-2222-222222222222', 'teacher1@guitcrm.test', 'Teacher One', false, true, false),
('33333333-3333-3333-3333-333333333333', 'teacher2@guitcrm.test', 'Teacher Two', false, true, false),
('44444444-4444-4444-4444-444444444444', 'student1@guitcrm.test', 'Student One', false, false, true),
('55555555-5555-5555-5555-555555555555', 'student2@guitcrm.test', 'Student Two', false, false, true),
('66666666-6666-6666-6666-666666666666', 'student3@guitcrm.test', 'Student Three', false, false, true),
('77777777-7777-7777-7777-777777777777', 'teacher_student@guitcrm.test', 'Teacher Student', false, true, true)
ON CONFLICT (id) DO NOTHING;

-- Seed songs
INSERT INTO songs (id, title, author, level, key, ultimate_guitar_link, chords) VALUES
('a1111111-1111-1111-1111-111111111111', 'Wonderwall', 'Oasis', 'beginner', 'Em', 'https://www.ultimate-guitar.com/pro?song_id=1', 'Em7 Dsus2 A7sus4'),
('a2222222-2222-2222-2222-222222222222', 'Knockin on Heaven''s Door', 'Bob Dylan', 'beginner', 'G', 'https://www.ultimate-guitar.com/pro?song_id=2', 'G D Am7 D'),
('a3333333-3333-3333-3333-333333333333', 'House of the Rising Sun', 'The Animals', 'beginner', 'Am', 'https://www.ultimate-guitar.com/pro?song_id=3', 'Am C D F'),
('b1111111-1111-1111-1111-111111111111', 'Stairway to Heaven', 'Led Zeppelin', 'intermediate', 'Am', 'https://www.ultimate-guitar.com/pro?song_id=4', 'Am Asus2 Dsus2'),
('b2222222-2222-2222-2222-222222222222', 'Comfortably Numb', 'Pink Floyd', 'intermediate', 'B', 'https://www.ultimate-guitar.com/pro?song_id=5', 'B F# B F#'),
('b3333333-3333-3333-3333-333333333333', 'Hotel California', 'Eagles', 'intermediate', 'Bm', 'https://www.ultimate-guitar.com/pro?song_id=6', 'Bm F# Bm F#'),
('b4444444-4444-4444-4444-444444444444', 'Layla', 'Eric Clapton', 'intermediate', 'Dm', 'https://www.ultimate-guitar.com/pro?song_id=9', 'Dm Bb F'),
('c1111111-1111-1111-1111-111111111111', 'One', 'Metallica', 'advanced', 'Em', 'https://www.ultimate-guitar.com/pro?song_id=7', 'Em F# G A'),
('c2222222-2222-2222-2222-222222222222', 'Eruption', 'Van Halen', 'advanced', 'F#m', 'https://www.ultimate-guitar.com/pro?song_id=8', 'F#m'),
('c3333333-3333-3333-3333-333333333333', 'All of Me', 'John Legend', 'intermediate', 'A', 'https://www.ultimate-guitar.com/pro?song_id=10', 'A Dm E')
ON CONFLICT (id) DO NOTHING;

-- Seed lessons
INSERT INTO lessons (id, teacher_id, student_id, lesson_teacher_number, scheduled_at, status, notes) VALUES
('d1111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 1, NOW() + INTERVAL '7 days', 'SCHEDULED', 'First lesson - basics'),
('d2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 2, NOW() + INTERVAL '14 days', 'SCHEDULED', 'Chord progressions'),
('d3333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 1, NOW() + INTERVAL '7 days', 'SCHEDULED', 'Strumming patterns'),
('d4444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', 1, NOW(), 'COMPLETED', 'Practice session'),
('d5555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', '44444444-4444-4444-4444-444444444444', 1, NOW() + INTERVAL '10 days', 'SCHEDULED', 'Technique review')
ON CONFLICT (id) DO NOTHING;

-- Seed lesson_songs
INSERT INTO lesson_songs (id, lesson_id, song_id, status, notes) VALUES
('e1111111-1111-1111-1111-111111111111', 'd1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'to_learn', 'Start with Wonderwall'),
('e2222222-2222-2222-2222-222222222222', 'd1111111-1111-1111-1111-111111111111', 'a2222222-2222-2222-2222-222222222222', 'to_learn', 'Learn basic progression'),
('e3333333-3333-3333-3333-333333333333', 'd2222222-2222-2222-2222-222222222222', 'b1111111-1111-1111-1111-111111111111', 'started', 'Working on Stairway'),
('e4444444-4444-4444-4444-444444444444', 'd3333333-3333-3333-3333-333333333333', 'a3333333-3333-3333-3333-333333333333', 'remembered', 'Student remembered this'),
('e5555555-5555-5555-5555-555555555555', 'd4444444-4444-4444-4444-444444444444', 'b2222222-2222-2222-2222-222222222222', 'mastered', 'Completed'),
('e6666666-6666-6666-6666-666666666666', 'd4444444-4444-4444-4444-444444444444', 'b3333333-3333-3333-3333-333333333333', 'with_author', 'Played with backing track'),
('e7777777-7777-7777-7777-777777777777', 'd5555555-5555-5555-5555-555555555555', 'c1111111-1111-1111-1111-111111111111', 'to_learn', 'Advanced piece'),
('e8888888-8888-8888-8888-888888888888', 'd5555555-5555-5555-5555-555555555555', 'b4444444-4444-4444-4444-444444444444', 'started', 'Learning Layla')
ON CONFLICT (id) DO NOTHING;

-- Seed task_management (basic assignments - table structure is simple at this point)
INSERT INTO task_management (id, user_id, title, description, due_date, status, priority) VALUES
('f1111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'Practice Wonderwall', 'Practice the basic progression daily', NOW() + INTERVAL '7 days', 'OPEN', 'HIGH'),
('f2222222-2222-2222-2222-222222222222', '55555555-5555-5555-5555-555555555555', 'Learn chord changes', 'Work on smooth chord transitions', NOW() + INTERVAL '3 days', 'IN_PROGRESS', 'MEDIUM'),
('f3333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666666', 'Finger strength exercises', 'Do stretching exercises 3x daily', NOW() + INTERVAL '14 days', 'OPEN', 'HIGH'),
('f4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'Record practice video', 'Record yourself playing and send', NOW() + INTERVAL '10 days', 'PENDING_REVIEW', 'MEDIUM'),
('f5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'Attend group class', 'Monthly group guitar class', NOW() - INTERVAL '2 days', 'COMPLETED', 'LOW'),
('f6666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 'Theory homework', 'Complete music theory worksheet', NOW() + INTERVAL '5 days', 'IN_PROGRESS', 'HIGH')
ON CONFLICT (id) DO NOTHING;