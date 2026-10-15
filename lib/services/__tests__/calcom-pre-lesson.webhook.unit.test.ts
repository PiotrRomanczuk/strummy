import { processCalcomBookingPayload, CalcomBookingPayload } from '../calcom';
import { sendPreLessonEmail } from '../calcom-pre-lesson.helpers';
import { createAdminClient } from '@/lib/supabase/admin';

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }));
jest.mock('../calcom-pre-lesson.helpers', () => ({ sendPreLessonEmail: jest.fn() }));

const payload: CalcomBookingPayload = {
  triggerEvent: 'BOOKING_CREATED',
  uid: 'uid_1',
  startTime: '2026-11-03T17:30:00.000Z',
  endTime: '2026-11-03T18:30:00.000Z',
  attendees: [{ name: 'Ola Nowak', email: 'Ola@Example.com' }],
  responses: { guitar_skill_level: { value: 'Podstawowy' } },
};

function mockDb(existingLesson: { id: string } | null) {
  const chain = (row: unknown) => ({
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: row }),
    single: jest.fn().mockResolvedValue({ data: { id: 'new_id' }, error: null }),
  });
  const tables: Record<string, unknown> = {
    user_roles: chain({ user_id: 'teacher_1' }),
    profiles: chain(null),
    lessons: chain(existingLesson),
  };
  (createAdminClient as jest.Mock).mockReturnValue({ from: (table: string) => tables[table] });
}

beforeEach(() => jest.clearAllMocks());

it('mails the warm-up lesson when the booking creates a new lesson', async () => {
  mockDb(null);
  await processCalcomBookingPayload(payload);
  expect(sendPreLessonEmail).toHaveBeenCalledWith(expect.anything(), 'new_id', {
    email: 'ola@example.com',
    name: 'Ola Nowak',
    startTime: payload.startTime,
    skillLevel: 'novice',
  });
});

it('does not mail again when Cal.com retries a booking that is already stored', async () => {
  mockDb({ id: 'lesson_1' });
  await processCalcomBookingPayload(payload);
  expect(sendPreLessonEmail).not.toHaveBeenCalled();
});
