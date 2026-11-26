/**
 * calendar-lesson-sync: a lesson reaches the teacher's Google Calendar through
 * the teacher's auth id, which differs from `lessons.teacher_id` (a profile
 * id) for every account created since S2.
 */

import { syncLessonCreation, syncLessonDeletion, syncLessonUpdate } from './calendar-lesson-sync';

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
jest.mock('@/lib/google', () => ({
  createGoogleCalendarEvent: (...args: unknown[]) => mockCreate(...args),
  updateGoogleCalendarEvent: (...args: unknown[]) => mockUpdate(...args),
  deleteGoogleCalendarEvent: (...args: unknown[]) => mockDelete(...args),
}));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));

const TEACHER_PROFILE = 'profile-teacher';
const TEACHER_AUTH = 'auth-teacher';

type Row = Record<string, unknown> | null;

/** One `.single()` result per table, and a record of lesson updates. */
function client(rows: { profiles?: Row; user_integrations?: Row; lessons?: Row }) {
  const lessonUpdates: unknown[] = [];
  const from = (table: keyof typeof rows) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      single: async () => ({
        data: rows[table] ?? null,
        error: rows[table] ? null : { code: 'PGRST116' },
      }),
      update: (values: unknown) => {
        lessonUpdates.push(values);
        return chain;
      },
    };
    return chain;
  };
  return { supabase: { from } as never, lessonUpdates };
}

const lesson = {
  id: 'lesson-1',
  title: 'Guitar',
  scheduled_at: '2026-12-01T17:00:00Z',
  student_id: 'profile-student',
  teacher_id: TEACHER_PROFILE,
  google_event_id: 'evt-1',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({ eventId: 'evt-new' });
});

describe('syncLessonCreation', () => {
  it('creates the event in the Google account of the teacher’s auth id', async () => {
    const { supabase, lessonUpdates } = client({
      profiles: { user_id: TEACHER_AUTH, email: 'student@example.com' },
      user_integrations: { access_token: 'token' },
    });

    await syncLessonCreation(supabase, lesson);

    expect(mockCreate).toHaveBeenCalledWith(TEACHER_AUTH, expect.any(Object));
    expect(lessonUpdates).toContainEqual({ google_event_id: 'evt-new' });
  });

  it('does nothing when the teacher has not connected Google', async () => {
    const { supabase } = client({ profiles: { user_id: TEACHER_AUTH }, user_integrations: null });

    await syncLessonCreation(supabase, lesson);

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('does nothing for a teacher profile with no account behind it', async () => {
    const { supabase } = client({
      profiles: { user_id: null },
      user_integrations: { access_token: 't' },
    });

    await syncLessonCreation(supabase, lesson);

    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('syncLessonUpdate and syncLessonDeletion', () => {
  it('update and delete go through the auth id too', async () => {
    const { supabase } = client({
      profiles: { user_id: TEACHER_AUTH },
      user_integrations: { access_token: 'token' },
      lessons: { google_event_id: 'evt-1', teacher_id: TEACHER_PROFILE },
    });

    await syncLessonUpdate(supabase, lesson, { title: 'Moved' });
    await syncLessonDeletion(supabase, 'lesson-1');

    expect(mockUpdate).toHaveBeenCalledWith(TEACHER_AUTH, 'evt-1', expect.any(Object));
    expect(mockDelete).toHaveBeenCalledWith(TEACHER_AUTH, 'evt-1');
  });
});
