import {
  applyLessonChange,
  cancelLessonsForEvents,
  lessonChangeFor,
  type ImportedLesson,
} from './calendar-event-changes';

jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), error: jest.fn() } }));

const lesson = (overrides: Partial<ImportedLesson> = {}): ImportedLesson => ({
  id: 'lesson-1',
  status: 'SCHEDULED',
  scheduled_at: '2026-12-01T17:00:00+00:00',
  duration_minutes: 60,
  updated_at: '2026-11-20T10:00:00+00:00',
  ...overrides,
});

describe('lessonChangeFor', () => {
  it('leaves a lesson whose event did not move', () => {
    // Same instant written in another offset.
    const event = { startTime: '2026-12-01T18:00:00+01:00', durationMinutes: 60 };
    expect(lessonChangeFor(lesson(), event)).toEqual({ kind: 'none' });
  });

  it('moves a scheduled lesson with its event', () => {
    const event = { startTime: '2026-12-03T18:00:00+01:00', durationMinutes: 60 };
    expect(lessonChangeFor(lesson(), event)).toEqual({
      kind: 'reschedule',
      scheduledAt: '2026-12-03T18:00:00+01:00',
      durationMinutes: 60,
    });
  });

  it('follows a new length, and keeps the old one when the event has none', () => {
    const longer = { startTime: '2026-12-01T18:00:00+01:00', durationMinutes: 90 };
    expect(lessonChangeFor(lesson(), longer)).toMatchObject({ durationMinutes: 90 });
    const moved = { startTime: '2026-12-02T18:00:00+01:00', durationMinutes: null };
    expect(lessonChangeFor(lesson(), moved)).toMatchObject({ durationMinutes: 60 });
  });

  it('keeps a lesson saved in Strummy after the event last changed (its push may have failed)', () => {
    const stale = {
      startTime: '2026-12-03T18:00:00+01:00',
      durationMinutes: 60,
      updatedAt: '2026-11-19T09:00:00Z',
    };
    expect(lessonChangeFor(lesson(), stale)).toEqual({ kind: 'none' });
  });

  it('follows an event changed after the lesson was saved', () => {
    const newer = {
      startTime: '2026-12-03T18:00:00+01:00',
      durationMinutes: 60,
      updatedAt: '2026-11-21T09:00:00Z',
    };
    expect(lessonChangeFor(lesson(), newer)).toMatchObject({ kind: 'reschedule' });
  });

  it.each(['COMPLETED', 'CANCELLED', 'IN_PROGRESS'] as const)(
    'never touches a %s lesson: Strummy wins once the teacher acted',
    (status) => {
      const event = { startTime: '2026-12-09T18:00:00+01:00', durationMinutes: 45 };
      expect(lessonChangeFor(lesson({ status }), event)).toEqual({ kind: 'none' });
    }
  );
});

/** A Supabase stand-in that records each chained call on `lessons`. */
function admin(result: { data?: unknown; error: { message: string } | null }) {
  const calls: Array<[string, unknown[]]> = [];
  const chain: Record<string, unknown> = {};
  for (const method of ['update', 'eq', 'in', 'is', 'select']) {
    chain[method] = (...args: unknown[]) => {
      calls.push([method, args]);
      return chain;
    };
  }
  chain.then = (resolve: (r: unknown) => unknown) => resolve(result);
  return { client: { from: () => chain } as never, calls };
}

describe('applyLessonChange', () => {
  it('updates only while the lesson is still scheduled', async () => {
    const { client, calls } = admin({ error: null });
    const event = { startTime: '2026-12-03T18:00:00+01:00', durationMinutes: 60 };

    expect(await applyLessonChange(client, lesson(), event)).toBe(true);
    expect(calls).toContainEqual(['eq', ['status', 'SCHEDULED']]);
  });

  it('writes nothing when nothing changed', async () => {
    const { client, calls } = admin({ error: null });
    const event = { startTime: '2026-12-01T18:00:00+01:00', durationMinutes: 60 };

    expect(await applyLessonChange(client, lesson(), event)).toBe(false);
    expect(calls).toEqual([]);
  });
});

describe('cancelLessonsForEvents', () => {
  it('cancels this teacher’s scheduled lessons made from the deleted events', async () => {
    const { client, calls } = admin({ data: [{ id: 'a' }, { id: 'b' }], error: null });

    expect(await cancelLessonsForEvents(client, 'teacher-1', ['evt-1', 'evt-2'])).toBe(2);
    expect(calls).toEqual(
      expect.arrayContaining([
        ['update', [{ status: 'CANCELLED' }]],
        ['eq', ['teacher_id', 'teacher-1']],
        ['eq', ['status', 'SCHEDULED']],
        ['in', ['google_event_id', ['evt-1', 'evt-2']]],
      ])
    );
  });

  it('does not query without deleted events, and reports 0 on an error', async () => {
    const empty = admin({ error: null });
    expect(await cancelLessonsForEvents(empty.client, 'teacher-1', [])).toBe(0);
    expect(empty.calls).toEqual([]);

    const failing = admin({ data: null, error: { message: 'boom' } });
    expect(await cancelLessonsForEvents(failing.client, 'teacher-1', ['evt-1'])).toBe(0);
  });
});
