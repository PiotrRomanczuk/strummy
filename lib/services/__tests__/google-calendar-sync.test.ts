import { fetchAndSyncRecentEvents } from '../google-calendar-sync';
import { eventDurationMinutes } from '@/lib/calendar/calendar-utils';

const mockGetEvents = jest.fn();
jest.mock('@/lib/google', () => ({
  getCalendarEventsInRangeAdmin: (...args: unknown[]) => mockGetEvents(...args),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockResolveStudent = jest.fn();
jest.mock('@/lib/services/calendar-attendee', () => ({
  ...jest.requireActual('@/lib/services/calendar-attendee'),
  resolveLessonStudent: (...args: unknown[]) => mockResolveStudent(...args),
}));

const AUTH_ID = 'auth-teacher';
const PROFILE_ID = 'profile-teacher';

const profileSingle = jest.fn();
const lessonInsert = jest.fn();
const adminFrom = jest.fn();
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({ from: adminFrom })),
}));

const event = (overrides: Record<string, unknown> = {}) => ({
  id: 'evt-1',
  summary: 'Guitar lesson',
  description: 'Powered by Calendly.com',
  start: { dateTime: '2026-11-10T16:00:00+01:00' },
  end: { dateTime: '2026-11-10T16:45:00+01:00' },
  attendees: [{ email: 'ada@example.com', displayName: 'Ada Student' }],
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  profileSingle.mockResolvedValue({ data: { id: PROFILE_ID, email: 'teacher@example.com' } });
  lessonInsert.mockResolvedValue({ error: null });
  mockResolveStudent.mockResolvedValue({ ok: true, studentId: 'profile-ada', via: 'student' });
  mockGetEvents.mockResolvedValue([event()]);
  adminFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return { select: () => ({ eq: () => ({ single: profileSingle }) }) };
    return {
      select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }),
      insert: lessonInsert,
    };
  });
});

describe('fetchAndSyncRecentEvents', () => {
  it('writes the teacher profile id, not the auth id, into lessons.teacher_id', async () => {
    const res = await fetchAndSyncRecentEvents(AUTH_ID);

    expect(res).toMatchObject({ success: true, count: 1, skipped: 0 });
    expect(lessonInsert).toHaveBeenCalledWith(
      expect.objectContaining({ teacher_id: PROFILE_ID, student_id: 'profile-ada' })
    );
  });

  it('imports a calendar event as SCHEDULED with its length, leaving attendance to the teacher', async () => {
    await fetchAndSyncRecentEvents(AUTH_ID);

    expect(lessonInsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SCHEDULED', duration_minutes: 45 })
    );
  });

  it("matches the event's attendees against everyone but the teacher", async () => {
    await fetchAndSyncRecentEvents(AUTH_ID);

    expect(mockResolveStudent).toHaveBeenCalledWith(
      [{ email: 'ada@example.com', displayName: 'Ada Student' }],
      'teacher@example.com',
      expect.anything()
    );
  });

  it('leaves an event the match cannot settle for the teacher and imports nothing', async () => {
    mockResolveStudent.mockResolvedValue({ ok: false, reason: 'parent_with_several_children' });

    const res = await fetchAndSyncRecentEvents(AUTH_ID);

    expect(res).toMatchObject({ success: true, count: 0, skipped: 1 });
    expect(lessonInsert).not.toHaveBeenCalled();
    expect(res.details?.results[0].error).toMatch(/several children/);
  });

  it('does not look up the student of an event that is already imported', async () => {
    adminFrom.mockImplementation((table: string) => {
      if (table === 'profiles')
        return { select: () => ({ eq: () => ({ single: profileSingle }) }) };
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: { id: 'lesson-1' } }) }) }),
        insert: lessonInsert,
      };
    });

    const res = await fetchAndSyncRecentEvents(AUTH_ID);

    expect(res).toMatchObject({ success: true, count: 0, skipped: 1 });
    expect(mockResolveStudent).not.toHaveBeenCalled();
  });

  it('asks Google for deleted events too, so cancellations reach the lessons', async () => {
    await fetchAndSyncRecentEvents(AUTH_ID);

    expect(mockGetEvents).toHaveBeenCalledWith(AUTH_ID, expect.any(Date), expect.any(Date), {
      includeCancelled: true,
    });
  });

  it('turns a week of calendar lessons into as many lessons, and nothing else', async () => {
    const week = ['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-04'].map((day) =>
      event({
        id: `evt-${day}`,
        start: { dateTime: `${day}T17:00:00+01:00` },
        end: { dateTime: `${day}T18:00:00+01:00` },
      })
    );
    mockGetEvents.mockResolvedValue([
      ...week,
      event({ id: 'evt-english', summary: 'Ang Ada Student and Teacher' }),
      event({ id: 'evt-concert', summary: 'Concert', description: 'Tickets', attendees: [] }),
    ]);

    const res = await fetchAndSyncRecentEvents(AUTH_ID);

    expect(res).toMatchObject({ success: true, count: 4 });
    expect(lessonInsert).toHaveBeenCalledTimes(4);
    expect(lessonInsert).toHaveBeenCalledWith(expect.objectContaining({ duration_minutes: 60 }));
  });

  /** The event's lesson already exists; returns the mock its update goes through. */
  function existingLesson(overrides: Record<string, unknown> = {}) {
    const lessonUpdate = jest.fn();
    const chain = {
      eq: () => chain,
      then: (resolve: (r: unknown) => unknown) => resolve({ error: null }),
    };
    lessonUpdate.mockReturnValue(chain);
    const row = {
      id: 'lesson-1',
      status: 'SCHEDULED',
      scheduled_at: '2026-11-09T15:00:00+00:00',
      duration_minutes: 45,
      updated_at: '2026-11-01T10:00:00+00:00',
      teacher_id: PROFILE_ID,
      deleted_at: null,
      ...overrides,
    };
    adminFrom.mockImplementation((table: string) => {
      if (table === 'profiles')
        return { select: () => ({ eq: () => ({ single: profileSingle }) }) };
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: row }) }) }),
        update: lessonUpdate,
        insert: lessonInsert,
      };
    });
    return lessonUpdate;
  }

  it('moves an imported scheduled lesson when its event moves', async () => {
    const lessonUpdate = existingLesson();

    const res = await fetchAndSyncRecentEvents(AUTH_ID);

    expect(res).toMatchObject({ success: true, count: 0, updated: 1, skipped: 0 });
    expect(lessonUpdate).toHaveBeenCalledWith({
      scheduled_at: '2026-11-10T16:00:00+01:00',
      duration_minutes: 45,
    });
    expect(lessonInsert).not.toHaveBeenCalled();
  });

  it.each([
    ["another teacher's lesson", { teacher_id: 'profile-other-teacher' }],
    ['a deleted lesson', { deleted_at: '2026-11-05T10:00:00+00:00' }],
    ['a lesson saved after the event last changed', { updated_at: '2026-11-08T10:00:00+00:00' }],
  ])('leaves %s where it is', async (_case, overrides) => {
    const lessonUpdate = existingLesson(overrides);
    mockGetEvents.mockResolvedValue([event({ updated: '2026-11-07T10:00:00Z' })]);

    const res = await fetchAndSyncRecentEvents(AUTH_ID);

    expect(res).toMatchObject({ success: true, count: 0, updated: 0, skipped: 1 });
    expect(lessonUpdate).not.toHaveBeenCalled();
    expect(lessonInsert).not.toHaveBeenCalled();
  });

  it('cancels the lessons of deleted events and does not import them', async () => {
    const cancelled = jest.fn();
    const chain: Record<string, unknown> = {};
    for (const m of ['eq', 'in', 'is']) chain[m] = () => chain;
    chain.select = async () => ({ data: [{ id: 'lesson-1' }], error: null });
    cancelled.mockReturnValue(chain);
    adminFrom.mockImplementation((table: string) => {
      if (table === 'profiles')
        return { select: () => ({ eq: () => ({ single: profileSingle }) }) };
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: null }) }) }),
        update: cancelled,
        insert: lessonInsert,
      };
    });
    mockGetEvents.mockResolvedValue([{ id: 'evt-gone', status: 'cancelled' }]);

    const res = await fetchAndSyncRecentEvents(AUTH_ID);

    expect(cancelled).toHaveBeenCalledWith({ status: 'CANCELLED' });
    expect(res).toMatchObject({ success: true, count: 0, cancelled: 1 });
    expect(lessonInsert).not.toHaveBeenCalled();
  });

  it('fails loudly when the Google account has no profile', async () => {
    profileSingle.mockResolvedValue({ data: null });

    const res = await fetchAndSyncRecentEvents(AUTH_ID);

    expect(res).toEqual({ success: false, error: 'Teacher profile not found' });
    expect(lessonInsert).not.toHaveBeenCalled();
  });
});

describe('eventDurationMinutes', () => {
  it('returns whole minutes for a plausible lesson', () => {
    expect(eventDurationMinutes('2026-11-10T16:00:00Z', '2026-11-10T17:00:00Z')).toBe(60);
  });

  it.each([
    ['a five-minute reminder', '2026-11-10T16:00:00Z', '2026-11-10T16:05:00Z'],
    ['a day-long block', '2026-11-10T08:00:00Z', '2026-11-10T20:00:00Z'],
    ['a missing end', '2026-11-10T16:00:00Z', undefined],
    ['an unparseable date', 'soon', '2026-11-10T16:05:00Z'],
  ])('returns null for %s (the column CHECK is 15–180)', (_label, start, end) => {
    expect(eventDurationMinutes(start, end)).toBeNull();
  });
});
