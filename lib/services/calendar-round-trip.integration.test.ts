/**
 * A lesson edited in Strummy goes to Google and comes back in the next
 * calendar sync. Only Google's HTTP API and the database are stood in for:
 * syncLessonUpdate → updateGoogleCalendarEvent → the request Google receives
 * → the event the sync reads → lessonChangeFor. The round trip must not
 * change the lesson (#1201 review: a 45-minute lesson came back as 60).
 */

import { syncLessonUpdate } from './calendar-lesson-sync';
import { lessonChangeFor } from './calendar-event-changes';
import { eventDurationMinutes } from '@/lib/calendar/calendar-utils';

const mockPatch = jest.fn();
jest.mock('googleapis', () => ({
  google: {
    auth: { OAuth2: jest.fn(() => ({ setCredentials: jest.fn() })) },
    calendar: jest.fn(() => ({ events: { patch: (...args: unknown[]) => mockPatch(...args) } })),
  },
}));
jest.mock('@/lib/ai/retry', () => ({
  withRetry: (fn: () => unknown) => fn(),
  AI_PROVIDER_RETRY_CONFIG: {},
}));
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

/** One client for the sync and for the Google token lookup it triggers. */
const rows: Record<string, Record<string, unknown>> = {
  profiles: { user_id: 'auth-teacher' },
  user_integrations: {
    access_token: 'token',
    refresh_token: 'refresh',
    expires_at: Date.now() + 3_600_000,
  },
};
const supabase = {
  from: (table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      update: () => chain,
      single: async () => ({ data: rows[table] ?? null, error: null }),
    };
    return chain;
  },
};
jest.mock('@/lib/supabase/server', () => ({ createClient: async () => supabase }));

const SAVED_AT = '2026-11-26T10:00:00Z';
const lesson = {
  id: 'lesson-1',
  title: 'Guitar',
  scheduled_at: '2026-12-03T17:00:00.000Z',
  duration_minutes: 45,
  student_id: 'profile-student',
  teacher_id: 'profile-teacher',
  google_event_id: 'evt-1',
  status: 'SCHEDULED' as const,
  updated_at: SAVED_AT,
};

/** The event as the next sync reads it back after Google stored `requestBody`. */
function eventGoogleStored(updatedAt: string) {
  const { start, end } = mockPatch.mock.calls[0][0].requestBody;
  return {
    startTime: start.dateTime,
    durationMinutes: eventDurationMinutes(start.dateTime, end.dateTime),
    updatedAt,
  };
}

beforeAll(() => {
  process.env.GOOGLE_CLIENT_ID = 'client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'client-secret';
  process.env.GOOGLE_REDIRECT_URI = 'http://localhost/callback';
});

beforeEach(() => {
  jest.clearAllMocks();
  mockPatch.mockResolvedValue({});
});

describe('Strummy → Google → next calendar sync', () => {
  it.each([
    ['a moved lesson', { ...lesson }, { scheduled_at: lesson.scheduled_at }],
    ['a new length', { ...lesson, duration_minutes: 30 }, { duration_minutes: 30 }],
  ])('%s comes back unchanged', async (_case, saved, updates) => {
    await syncLessonUpdate(supabase as never, saved, updates);

    const echoed = eventGoogleStored('2026-11-26T10:00:02Z');
    expect(echoed.durationMinutes).toBe(saved.duration_minutes);
    expect(lessonChangeFor(saved, echoed)).toEqual({ kind: 'none' });
  });

  it('when the push fails, the stale event does not undo the teacher’s move', async () => {
    mockPatch.mockRejectedValue(new Error('Google API error'));

    await syncLessonUpdate(supabase as never, lesson, { scheduled_at: lesson.scheduled_at });

    // Google still holds the old time, last changed before the lesson was saved.
    const stale = {
      startTime: '2026-12-01T17:00:00.000Z',
      durationMinutes: 45,
      updatedAt: '2026-11-20T09:00:00Z',
    };
    expect(mockPatch).toHaveBeenCalled();
    expect(lessonChangeFor(lesson, stale)).toEqual({ kind: 'none' });
  });
});
