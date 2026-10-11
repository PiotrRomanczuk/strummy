import {
  DISPATCHER_CADENCE_HOURS,
  LESSON_REMINDER_LEAD_HOURS,
  reminderWindow,
} from '../reminder-window';

const HOUR_MS = 60 * 60 * 1000;

describe('reminderWindow', () => {
  const now = new Date('2026-10-11T06:00:00Z');

  it('starts one lead time ahead and spans one cron cadence', () => {
    const { start, end } = reminderWindow(now);
    expect(start.toISOString()).toBe('2026-10-12T06:00:00.000Z');
    expect(end.getTime() - start.getTime()).toBe(DISPATCHER_CADENCE_HOURS * HOUR_MS);
    expect(start.getTime() - now.getTime()).toBe(LESSON_REMINDER_LEAD_HOURS * HOUR_MS);
  });

  it('leaves no gap between consecutive runs', () => {
    const first = reminderWindow(now);
    const nextRun = new Date(now.getTime() + DISPATCHER_CADENCE_HOURS * HOUR_MS);
    const second = reminderWindow(nextRun);
    expect(second.start.getTime()).toBe(first.end.getTime());
  });

  it('covers a lesson at any hour of the day with a daily cron', () => {
    // The old fixed 23–25 h window only matched lessons at 05:00–07:00 UTC.
    const runs = [now, new Date(now.getTime() + 24 * HOUR_MS)].map((t) =>
      reminderWindow(t, 24, 24)
    );
    for (let hour = 0; hour < 24; hour++) {
      const lesson = new Date(`2026-10-13T${String(hour).padStart(2, '0')}:30:00Z`);
      const covered = runs.filter((w) => lesson >= w.start && lesson < w.end);
      expect(covered).toHaveLength(1);
    }
  });

  it('shrinks to a one-hour window when the cron runs hourly', () => {
    const { start, end } = reminderWindow(now, 24, 1);
    expect(end.getTime() - start.getTime()).toBe(HOUR_MS);
  });
});
