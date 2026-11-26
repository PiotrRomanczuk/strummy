/**
 * calendar-lesson-sync: a lesson reaches the teacher's Google Calendar through
 * the teacher's auth id, which differs from `lessons.teacher_id` (a profile
 * id) for every account created since S2, and the event keeps the lesson's
 * length — the calendar sync reads a 60-minute default back as a resize.
 */

import { syncLessonCreation, syncLessonDeletion, syncLessonUpdate } from './calendar-lesson-sync';
import { logger } from '@/lib/logger';

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
const STUDENT_PROFILE = 'profile-student';

type Row = Record<string, unknown> | null;
interface Tables {
  /** Rows by `id`: the teacher's and the student's profile. */
  profiles?: Record<string, Row>;
  user_integrations?: Row;
  lessons?: Row;
}

/** A client whose `.single()` answers from `tables`; records lesson updates. */
function client(overrides: Tables = {}) {
  const tables: Tables = {
    profiles: {
      [TEACHER_PROFILE]: { user_id: TEACHER_AUTH },
      [STUDENT_PROFILE]: { email: 'student@example.com' },
    },
    user_integrations: { access_token: 'token' },
    lessons: { google_event_id: 'evt-1', teacher_id: TEACHER_PROFILE },
    ...overrides,
  };
  const lessonUpdates: unknown[] = [];
  const from = (table: keyof Tables) => {
    let id: unknown;
    const chain = {
      select: () => chain,
      eq: (column: string, value: unknown) => {
        if (column === 'id') id = value;
        return chain;
      },
      single: async () => {
        const row =
          table === 'profiles'
            ? (tables.profiles?.[id as string] ?? null)
            : (tables[table] ?? null);
        return { data: row, error: row ? null : { code: 'PGRST116' } };
      },
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
  notes: 'Bring a capo',
  student_id: STUDENT_PROFILE,
  teacher_id: TEACHER_PROFILE,
  google_event_id: 'evt-1',
  duration_minutes: 45,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({ eventId: 'evt-new' });
});

describe('syncLessonCreation', () => {
  it('creates the event, with the lesson’s length, in the account of the teacher’s auth id', async () => {
    const { supabase, lessonUpdates } = client();

    await syncLessonCreation(supabase, lesson);

    expect(mockCreate).toHaveBeenCalledWith(TEACHER_AUTH, {
      title: 'Guitar',
      scheduled_at: lesson.scheduled_at,
      notes: 'Bring a capo',
      student_email: 'student@example.com',
      duration_minutes: 45,
    });
    expect(lessonUpdates).toContainEqual({ google_event_id: 'evt-new' });
  });

  it('leaves notes and length to Google’s defaults when the lesson has none', async () => {
    await syncLessonCreation(client().supabase, { ...lesson, notes: null, duration_minutes: null });

    expect(mockCreate).toHaveBeenCalledWith(
      TEACHER_AUTH,
      expect.objectContaining({ notes: undefined, duration_minutes: undefined })
    );
  });

  it.each<[string, Tables]>([
    ['the teacher has not connected Google', { user_integrations: null }],
    ['the stored token is empty', { user_integrations: { access_token: '' } }],
    [
      'the teacher profile has no account behind it',
      { profiles: { [TEACHER_PROFILE]: { user_id: null } } },
    ],
    ['the teacher profile is missing', { profiles: {} }],
  ])('does nothing when %s', async (_case, tables) => {
    await syncLessonCreation(client(tables).supabase, lesson);

    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('skips a student without an email and says why', async () => {
    const { supabase } = client({ profiles: { [TEACHER_PROFILE]: { user_id: TEACHER_AUTH } } });

    await syncLessonCreation(supabase, lesson);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('student has no email'));
  });

  it('logs a Google error instead of failing the lesson', async () => {
    mockCreate.mockRejectedValue(new Error('Google API error'));

    await expect(syncLessonCreation(client().supabase, lesson)).resolves.toBeUndefined();
    expect(mockCreate).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('syncLessonUpdate', () => {
  it('a moved lesson sends the saved start and length', async () => {
    await syncLessonUpdate(client().supabase, lesson, { scheduled_at: lesson.scheduled_at });

    expect(mockUpdate).toHaveBeenCalledWith(TEACHER_AUTH, 'evt-1', {
      title: undefined,
      notes: undefined,
      scheduled_at: lesson.scheduled_at,
      duration_minutes: 45,
    });
  });

  it('a new length alone moves the event’s end', async () => {
    await syncLessonUpdate(
      client().supabase,
      { ...lesson, duration_minutes: 30 },
      {
        duration_minutes: 30,
      }
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      TEACHER_AUTH,
      'evt-1',
      expect.objectContaining({ scheduled_at: lesson.scheduled_at, duration_minutes: 30 })
    );
  });

  it('a lesson without a length keeps Google’s default', async () => {
    await syncLessonUpdate(
      client().supabase,
      { ...lesson, duration_minutes: null },
      {
        scheduled_at: lesson.scheduled_at,
      }
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      TEACHER_AUTH,
      'evt-1',
      expect.objectContaining({ duration_minutes: undefined })
    );
  });

  it('a new title or notes leaves the event’s time alone', async () => {
    await syncLessonUpdate(client().supabase, lesson, { title: 'Renamed', notes: 'New notes' });

    const sent = mockUpdate.mock.calls[0][2];
    expect(sent).toEqual({ title: 'Renamed', notes: 'New notes' });
    expect(sent).not.toHaveProperty('scheduled_at');
  });

  it('does nothing for a lesson that never reached Google', async () => {
    await syncLessonUpdate(
      client().supabase,
      { ...lesson, google_event_id: null },
      {
        title: 'Renamed',
      }
    );

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('does nothing when the teacher has not connected Google', async () => {
    await syncLessonUpdate(client({ user_integrations: null }).supabase, lesson, { title: 'X' });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('logs a Google error instead of failing the edit', async () => {
    mockUpdate.mockRejectedValue(new Error('Google API error'));

    await expect(
      syncLessonUpdate(client().supabase, lesson, { title: 'X' })
    ).resolves.toBeUndefined();
    expect(mockUpdate).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('syncLessonDeletion', () => {
  it('deletes the event through the auth id', async () => {
    await syncLessonDeletion(client().supabase, 'lesson-1');

    expect(mockDelete).toHaveBeenCalledWith(TEACHER_AUTH, 'evt-1');
  });

  it.each<[string, Tables]>([
    ['the lesson is missing', { lessons: null }],
    [
      'the lesson never reached Google',
      { lessons: { google_event_id: null, teacher_id: TEACHER_PROFILE } },
    ],
    ['the teacher has not connected Google', { user_integrations: null }],
  ])('does nothing when %s', async (_case, tables) => {
    await syncLessonDeletion(client(tables).supabase, 'lesson-1');

    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('logs a Google error instead of failing the deletion', async () => {
    mockDelete.mockRejectedValue(new Error('Google API error'));

    await expect(syncLessonDeletion(client().supabase, 'lesson-1')).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });
});
