import { cancelCalcomBooking, rescheduleCalcomBooking } from './calcom-booking-changes';
import type { CalcomBookingPayload } from './calcom';
import { createAdminClient } from '@/lib/supabase/admin';

jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: jest.fn() }));

const TEACHER_ID = '11111111-1111-4111-8111-111111111111';

interface QueryResult {
  data: unknown;
  error: { message: string } | null;
}

/** A PostgREST-like builder: every filter chains, awaiting it gives `result`. */
function query(result: QueryResult) {
  const builder: Record<string, jest.Mock> & { then?: unknown } = {};
  for (const method of ['select', 'update', 'insert', 'eq', 'is', 'in', 'limit']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.maybeSingle = jest.fn().mockResolvedValue(result);
  builder.single = jest.fn().mockResolvedValue(result);
  builder.then = (resolve: (value: QueryResult) => unknown) => resolve(result);
  return builder;
}

/** Each `from(table)` call takes the next queued builder for that table. */
function mockTables(queues: Record<string, ReturnType<typeof query>[]>) {
  const from = jest.fn((table: string) => {
    const next = queues[table]?.shift();
    if (!next) throw new Error(`unexpected query on ${table}`);
    return next;
  });
  (createAdminClient as jest.Mock).mockReturnValue({ from });
  return from;
}

const ok = (data: unknown): QueryResult => ({ data, error: null });

const reschedule = {
  uid: 'booking_new',
  rescheduleUid: 'booking_old',
  startTime: '2026-08-12T16:00:00.000Z',
  endTime: '2026-08-12T17:00:00.000Z',
};

const payload: CalcomBookingPayload = {
  triggerEvent: 'BOOKING_RESCHEDULED',
  ...reschedule,
  attendees: [{ name: 'Test Booker', email: 'booker@example.com' }],
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CALCOM_TEACHER_PROFILE_ID = TEACHER_ID;
});

afterAll(() => {
  delete process.env.CALCOM_TEACHER_PROFILE_ID;
});

describe('cancelCalcomBooking (BOOKING_CANCELLED)', () => {
  it('sets the scheduled lesson of that booking to CANCELLED', async () => {
    const update = query(ok([{ id: 'lesson_1' }]));
    mockTables({ lessons: [update] });

    const result = await cancelCalcomBooking('booking_old');

    expect(result).toEqual({ success: true, action: 'cancelled', lessonId: 'lesson_1' });
    expect(update.update).toHaveBeenCalledWith({ status: 'CANCELLED' });
    expect(update.eq).toHaveBeenCalledWith('calcom_booking_id', 'booking_old');
    expect(update.eq).toHaveBeenCalledWith('status', 'SCHEDULED');
  });

  it('is idempotent: a repeated event (no scheduled lesson left) changes nothing', async () => {
    mockTables({ lessons: [query(ok([]))] });

    const result = await cancelCalcomBooking('booking_old');

    expect(result).toEqual({ success: true, action: 'unchanged', lessonId: null });
  });

  it('throws (500, Cal.com retries) when the update fails', async () => {
    mockTables({ lessons: [query({ data: null, error: { message: 'boom' } })] });

    await expect(cancelCalcomBooking('booking_old')).rejects.toThrow('could not cancel lesson');
  });
});

describe('rescheduleCalcomBooking (BOOKING_RESCHEDULED)', () => {
  it('moves the existing lesson to the new slot and uid instead of creating a second', async () => {
    const lookup = query(ok(null));
    const move = query(ok([{ id: 'lesson_1' }]));
    const from = mockTables({ lessons: [lookup, move] });

    const result = await rescheduleCalcomBooking(reschedule, payload);

    expect(result).toEqual({ success: true, action: 'rescheduled', lessonId: 'lesson_1' });
    expect(lookup.eq).toHaveBeenCalledWith('calcom_booking_id', 'booking_new');
    expect(move.update).toHaveBeenCalledWith({
      scheduled_at: '2026-08-12T16:00:00.000Z',
      duration_minutes: 60,
      calcom_booking_id: 'booking_new',
    });
    expect(move.eq).toHaveBeenCalledWith('calcom_booking_id', 'booking_old');
    expect(move.insert).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalledWith('profiles');
  });

  it('defaults the moved lesson to 60 minutes when endTime is missing', async () => {
    const move = query(ok([{ id: 'lesson_1' }]));
    mockTables({ lessons: [query(ok(null)), move] });

    await rescheduleCalcomBooking({ ...reschedule, endTime: undefined }, payload);

    expect(move.update).toHaveBeenCalledWith(expect.objectContaining({ duration_minutes: 60 }));
  });

  it('is idempotent: when the new uid already has a lesson it only makes sure the old one is cancelled', async () => {
    const cancelOld = query(ok([]));
    mockTables({ lessons: [query(ok({ id: 'lesson_1' })), cancelOld] });

    const result = await rescheduleCalcomBooking(reschedule, payload);

    expect(result).toEqual({ success: true, action: 'unchanged', lessonId: 'lesson_1' });
    expect(cancelOld.update).toHaveBeenCalledWith({ status: 'CANCELLED' });
    expect(cancelOld.eq).toHaveBeenCalledWith('calcom_booking_id', 'booking_old');
  });

  it('creates the lesson like a new booking when neither uid is known', async () => {
    mockTables({
      lessons: [query(ok(null)), query(ok([])), query(ok(null)), query(ok({ id: 'lesson_9' }))],
      user_roles: [query(ok({ profile_id: TEACHER_ID }))],
      profiles: [query(ok({ id: 'student_1', is_parent: false }))],
    });

    const result = await rescheduleCalcomBooking(reschedule, payload);

    expect(result).toEqual({
      success: true,
      action: 'created',
      lessonId: 'lesson_9',
      studentId: 'student_1',
    });
  });
});
