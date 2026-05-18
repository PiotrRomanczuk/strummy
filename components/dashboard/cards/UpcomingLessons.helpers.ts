import type { TodayLessonRow } from './TodayLessons.helpers';

export type UpcomingLessonRow = TodayLessonRow;

export interface UpcomingLessonGroup {
  /** ISO date key (YYYY-MM-DD) in local time — stable for `key` prop. */
  dateKey: string;
  /** Display label like "Tomorrow" or "Wed, Mar 19". */
  label: string;
  lessons: UpcomingLessonRow[];
}

/**
 * Returns the [start, end) ISO window for "tomorrow through +7 days".
 * `start` is tomorrow at 00:00 local; `end` is 7 days after `start`.
 */
export function getUpcomingBounds(now: Date = new Date()): { start: string; end: string } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

function toDateKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatGroupLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const tomorrow = new Date(now);
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (toDateKey(d.toISOString()) === toDateKey(tomorrow.toISOString())) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Groups lessons by local-date key, preserving the ascending order of
 * `scheduled_at` both across and within groups.
 */
export function groupLessonsByDay(
  lessons: UpcomingLessonRow[],
  now: Date = new Date()
): UpcomingLessonGroup[] {
  const map = new Map<string, UpcomingLessonGroup>();
  for (const lesson of lessons) {
    const key = toDateKey(lesson.scheduled_at);
    const group = map.get(key);
    if (group) {
      group.lessons.push(lesson);
    } else {
      map.set(key, {
        dateKey: key,
        label: formatGroupLabel(lesson.scheduled_at, now),
        lessons: [lesson],
      });
    }
  }
  return Array.from(map.values());
}
