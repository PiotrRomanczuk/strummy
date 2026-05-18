import {
  getUpcomingBounds,
  groupLessonsByDay,
  type UpcomingLessonRow,
} from './UpcomingLessons.helpers';

function row(id: string, scheduledAt: string): UpcomingLessonRow {
  return {
    id,
    scheduled_at: scheduledAt,
    status: 'SCHEDULED',
    title: null,
    student: { id: 's1', full_name: 'A', email: 'a@x' },
  };
}

describe('getUpcomingBounds', () => {
  it('returns a 7-day window starting tomorrow at local midnight', () => {
    const now = new Date('2026-05-17T15:30:00.000Z');
    const { start, end } = getUpcomingBounds(now);
    const startDate = new Date(start);
    const endDate = new Date(end);

    // tomorrow at 00:00 local — second-precision matters more than ms
    expect(startDate.getHours()).toBe(0);
    expect(startDate.getMinutes()).toBe(0);
    expect(startDate.getSeconds()).toBe(0);

    // exactly 7 days apart
    const days = (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000);
    expect(days).toBe(7);
  });

  it('excludes today — start is at least 1 calendar day after `now`', () => {
    const now = new Date('2026-05-17T15:30:00.000Z');
    const { start } = getUpcomingBounds(now);
    expect(new Date(start).getTime()).toBeGreaterThan(now.getTime());
  });
});

describe('groupLessonsByDay', () => {
  it('returns an empty array when no lessons', () => {
    expect(groupLessonsByDay([])).toEqual([]);
  });

  it('groups lessons sharing a local date into one bucket', () => {
    const lessons = [
      row('a', '2026-05-18T09:00:00.000Z'),
      row('b', '2026-05-18T10:30:00.000Z'),
      row('c', '2026-05-19T11:00:00.000Z'),
    ];
    const groups = groupLessonsByDay(lessons, new Date('2026-05-17T12:00:00.000Z'));
    expect(groups).toHaveLength(2);
    expect(groups[0].lessons.map((l) => l.id)).toEqual(['a', 'b']);
    expect(groups[1].lessons.map((l) => l.id)).toEqual(['c']);
  });

  it('preserves input order across groups', () => {
    const lessons = [
      row('a', '2026-05-18T09:00:00.000Z'),
      row('b', '2026-05-19T09:00:00.000Z'),
      row('c', '2026-05-20T09:00:00.000Z'),
    ];
    const keys = groupLessonsByDay(lessons, new Date('2026-05-17T00:00:00.000Z')).map(
      (g) => g.dateKey
    );
    expect(keys).toEqual(['2026-05-18', '2026-05-19', '2026-05-20']);
  });

  it('labels the next calendar day as "Tomorrow"', () => {
    const now = new Date('2026-05-17T12:00:00.000Z');
    const groups = groupLessonsByDay([row('a', '2026-05-18T09:00:00.000Z')], now);
    expect(groups[0].label).toBe('Tomorrow');
  });

  it('labels later days with weekday + month + day', () => {
    const now = new Date('2026-05-17T12:00:00.000Z');
    const groups = groupLessonsByDay([row('a', '2026-05-20T09:00:00.000Z')], now);
    expect(groups[0].label).not.toBe('Tomorrow');
    expect(groups[0].label).toMatch(/[A-Za-z]{3}/);
  });
});
