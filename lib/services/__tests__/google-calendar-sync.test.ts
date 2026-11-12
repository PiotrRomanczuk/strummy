import { fetchAndSyncRecentEvents } from '../google-calendar-sync';
import { eventDurationMinutes } from '@/lib/calendar/calendar-utils';

const mockGetEvents = jest.fn();
jest.mock('@/lib/google', () => ({
  getCalendarEventsInRangeAdmin: (...args: unknown[]) => mockGetEvents(...args),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

const mockMatchStudent = jest.fn();
jest.mock('@/lib/services/import-utils', () => ({
  matchStudentByEmail: (...args: unknown[]) => mockMatchStudent(...args),
  createShadowStudent: jest.fn(),
}));

jest.mock('@/lib/services/calendar-bulk-import', () => ({
  resolveStudentAttendee: jest.fn(async (attendees: Array<{ email: string }>) => ({
    email: attendees[0].email,
    displayName: 'Ada Student',
  })),
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
  mockMatchStudent.mockResolvedValue({ status: 'MATCHED', candidates: [{ id: 'profile-ada' }] });
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
