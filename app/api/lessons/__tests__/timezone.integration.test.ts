/**
 * Integration test: create-lesson:timezone-integrity
 *
 * Locks the date+time round-trip property of prepareLessonForDb /
 * transformLessonData. A lesson booked at "2026-03-01 15:00" in the server's
 * local timezone must read back as the same wall-clock time, regardless of
 * the round-trip through scheduled_at (UTC).
 *
 * @see tasks/unbreakable-core.md → create-lesson:timezone-integrity
 */

import { prepareLessonForDb, transformLessonData } from '@/app/api/lessons/utils';

describe('create-lesson:timezone-integrity', () => {
  it('round-trips date+time through scheduled_at without drift', () => {
    const input = {
      student_id: '00000000-cccc-4000-a000-000000000003',
      teacher_id: '00000000-bbbb-4000-a000-000000000002',
      date: '2026-03-01',
      start_time: '15:00',
    };

    const dbData = prepareLessonForDb(input);
    expect(dbData.scheduled_at).toBeDefined();

    // Round-trip back through transformLessonData.
    const transformed = transformLessonData({
      id: 'l1',
      student_id: input.student_id,
      teacher_id: input.teacher_id,
      scheduled_at: dbData.scheduled_at as string,
    } as Parameters<typeof transformLessonData>[0]);

    expect(transformed.date).toBe('2026-03-01');
    expect(transformed.start_time).toBe('15:00');
  });

  it('preserves the wall-clock time across DST boundaries (March)', () => {
    // 2026-03-29 is the EU DST shift day. Booking 14:00 must still read 14:00
    // post round-trip.
    const dbData = prepareLessonForDb({
      date: '2026-03-29',
      start_time: '14:00',
    });

    const transformed = transformLessonData({
      id: 'l1',
      scheduled_at: dbData.scheduled_at as string,
    } as Parameters<typeof transformLessonData>[0]);

    expect(transformed.date).toBe('2026-03-29');
    expect(transformed.start_time).toBe('14:00');
  });

  it('defaults missing time to 00:00 for date-only inputs', () => {
    const dbData = prepareLessonForDb({ date: '2026-03-01' });

    const transformed = transformLessonData({
      id: 'l1',
      scheduled_at: dbData.scheduled_at as string,
    } as Parameters<typeof transformLessonData>[0]);

    expect(transformed.date).toBe('2026-03-01');
    expect(transformed.start_time).toBe('00:00');
  });

  it('produces a valid ISO 8601 UTC string (parses as a real Date)', () => {
    const dbData = prepareLessonForDb({
      date: '2026-03-01',
      start_time: '15:00',
    });
    const stamp = new Date(dbData.scheduled_at as string);
    expect(Number.isNaN(stamp.getTime())).toBe(false);
    expect((dbData.scheduled_at as string).endsWith('Z')).toBe(true);
  });

  it('drops the virtual date / start_time fields from the DB payload', () => {
    const dbData = prepareLessonForDb({
      date: '2026-03-01',
      start_time: '15:00',
      title: 'Lesson',
    });
    expect(dbData).not.toHaveProperty('date');
    expect(dbData).not.toHaveProperty('start_time');
    expect(dbData).toHaveProperty('scheduled_at');
    expect(dbData).toHaveProperty('title', 'Lesson');
  });
});
