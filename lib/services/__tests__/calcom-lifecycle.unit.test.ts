import { processCalcomBookingPayload, CalcomBookingPayload } from '../calcom';
import { durationMinutes } from '../calcom-lifecycle.helpers';
import { createAdminClient } from '@/lib/supabase/admin';

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

/** A lessons chain whose final maybeSingle() resolves to `row`. */
function lessonsChain(row: { id: string } | null) {
  const chain = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: row, error: null }),
  };
  return chain;
}

const base = { startTime: '2026-11-03T17:30:00.000Z', endTime: '2026-11-03T18:30:00.000Z', attendees: [] };

describe('Cal.com booking lifecycle', () => {
  const from = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (createAdminClient as jest.Mock).mockReturnValue({ from });
  });

  it('BOOKING_CANCELLED marks the still-scheduled lesson CANCELLED', async () => {
    const lessons = lessonsChain({ id: 'lesson_1' });
    from.mockReturnValue(lessons);

    const payload: CalcomBookingPayload = { ...base, triggerEvent: 'BOOKING_CANCELLED', uid: 'uid_1' };
    await expect(processCalcomBookingPayload(payload)).resolves.toEqual({
      success: true,
      action: 'cancelled',
      lessonId: 'lesson_1',
    });
    expect(lessons.update).toHaveBeenCalledWith({ status: 'CANCELLED' });
    expect(lessons.eq).toHaveBeenCalledWith('calcom_booking_id', 'uid_1');
    expect(lessons.eq).toHaveBeenCalledWith('status', 'SCHEDULED');
  });

  it('BOOKING_CANCELLED for an unknown booking is ignored, not an error', async () => {
    from.mockReturnValue(lessonsChain(null));
    const payload: CalcomBookingPayload = { ...base, triggerEvent: 'BOOKING_CANCELLED', uid: 'nope' };
    await expect(processCalcomBookingPayload(payload)).resolves.toMatchObject({ action: 'ignored' });
  });

  it('BOOKING_RESCHEDULED moves the existing lesson instead of creating a second one', async () => {
    const lessons = lessonsChain({ id: 'lesson_1' });
    from.mockReturnValue(lessons);

    const payload: CalcomBookingPayload = {
      ...base,
      triggerEvent: 'BOOKING_RESCHEDULED',
      uid: 'uid_new',
      rescheduleUid: 'uid_old',
    };
    await expect(processCalcomBookingPayload(payload)).resolves.toEqual({
      success: true,
      action: 'rescheduled',
      lessonId: 'lesson_1',
    });
    expect(lessons.update).toHaveBeenCalledWith({
      scheduled_at: base.startTime,
      duration_minutes: 60,
      calcom_booking_id: 'uid_new',
    });
    expect(lessons.eq).toHaveBeenCalledWith('calcom_booking_id', 'uid_old');
    expect(from).not.toHaveBeenCalledWith('profiles');
  });

  it('BOOKING_RESCHEDULED of a booking Strummy never saw falls back to importing it', async () => {
    from.mockReturnValue(lessonsChain(null));
    const payload: CalcomBookingPayload = {
      ...base,
      triggerEvent: 'BOOKING_RESCHEDULED',
      uid: 'uid_new',
      rescheduleUid: 'uid_old',
    };
    // No attendee → the create path runs and rejects; proves it did not stop at "rescheduled".
    await expect(processCalcomBookingPayload(payload)).rejects.toThrow('missing attendee email');
  });

  it.each(['MEETING_ENDED', 'BOOKING_REQUESTED', 'PING'])('ignores %s without touching the DB', async (event) => {
    const payload: CalcomBookingPayload = { ...base, triggerEvent: event, uid: 'uid_1' };
    await expect(processCalcomBookingPayload(payload)).resolves.toMatchObject({ action: 'ignored' });
    expect(from).not.toHaveBeenCalled();
  });
});

describe('durationMinutes', () => {
  it('defaults to a 60-minute lesson when Cal.com sends no end time', () => {
    expect(durationMinutes('2026-11-03T17:30:00.000Z')).toBe(60);
  });

  it('uses the real booking length when present', () => {
    expect(durationMinutes('2026-11-03T17:30:00.000Z', '2026-11-03T18:00:00.000Z')).toBe(30);
  });
});
