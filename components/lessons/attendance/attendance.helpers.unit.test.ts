import type { LessonRow } from '@/lib/services/lessons-queries';

import { isAwaitingConfirmation, summariseAttendance } from './attendance.helpers';

const NOW = new Date('2026-11-12T12:00:00Z');

const lesson = (overrides: Partial<LessonRow>): LessonRow =>
  ({
    id: 'l1',
    scheduledAt: '2026-11-10T16:00:00Z',
    status: 'SCHEDULED',
    studentId: 's1',
    studentName: 'Ada',
    studentEmail: 'ada@example.com',
    ...overrides,
  }) as LessonRow;

describe('isAwaitingConfirmation', () => {
  it('is true for a past lesson nobody has answered for', () => {
    expect(isAwaitingConfirmation(lesson({}), NOW)).toBe(true);
    expect(isAwaitingConfirmation(lesson({ status: 'IN_PROGRESS' }), NOW)).toBe(true);
  });

  it('is false for a lesson that has not started yet', () => {
    expect(isAwaitingConfirmation(lesson({ scheduledAt: '2026-11-13T16:00:00Z' }), NOW)).toBe(
      false
    );
  });

  it.each(['COMPLETED', 'CANCELLED'])('is false once the lesson is %s', (status) => {
    expect(isAwaitingConfirmation(lesson({ status }), NOW)).toBe(false);
  });

  it('accepts the lowercase status the list views use', () => {
    expect(isAwaitingConfirmation(lesson({ status: 'scheduled' }), NOW)).toBe(true);
  });
});

describe('summariseAttendance', () => {
  it('counts held, not held and awaiting per student, ignoring future lessons', () => {
    const rows = summariseAttendance(
      [
        lesson({ id: 'a', status: 'COMPLETED' }),
        lesson({ id: 'b', status: 'COMPLETED' }),
        lesson({ id: 'c', status: 'CANCELLED' }),
        lesson({ id: 'd', status: 'SCHEDULED' }),
        lesson({ id: 'e', status: 'SCHEDULED', scheduledAt: '2026-11-20T16:00:00Z' }),
      ],
      NOW
    );

    expect(rows).toEqual([
      expect.objectContaining({ studentId: 's1', held: 2, notHeld: 1, awaiting: 1 }),
    ]);
  });

  it('keeps students apart and orders them by name', () => {
    const rows = summariseAttendance(
      [
        lesson({ id: 'a', studentId: 's2', studentName: 'Zoe', status: 'COMPLETED' }),
        lesson({ id: 'b', studentId: 's1', studentName: 'Ada', status: 'CANCELLED' }),
      ],
      NOW
    );

    expect(rows.map((r) => [r.studentName, r.held, r.notHeld])).toEqual([
      ['Ada', 0, 1],
      ['Zoe', 1, 0],
    ]);
  });

  it('returns nothing for a month that has not started', () => {
    expect(summariseAttendance([lesson({ scheduledAt: '2026-12-01T10:00:00Z' })], NOW)).toEqual([]);
  });
});
