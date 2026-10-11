/**
 * The time window a reminder cron selects lessons from.
 *
 * A run has to pick up every lesson that will be `leadHours` away at some
 * point before the NEXT run, otherwise lessons fall between runs: with a daily
 * cron and the old fixed 23–25 h window, only lessons at 05:00–07:00 UTC ever
 * got a reminder. So the window starts `leadHours` ahead and spans one cron
 * cadence. The dedup on (type, entity) in the queue processor makes an overlap
 * at the boundary harmless.
 */

const HOUR_MS = 60 * 60 * 1000;

/** How far ahead of the lesson the "24h" reminder is meant to go out. */
export const LESSON_REMINDER_LEAD_HOURS = 24;

/**
 * How often the dispatcher runs — `vercel.json` schedules it once a day
 * (Vercel Hobby allows no shorter schedule). Change both together.
 */
export const DISPATCHER_CADENCE_HOURS = 24;

export interface ReminderWindow {
  start: Date;
  end: Date;
}

export function reminderWindow(
  now: Date,
  leadHours: number = LESSON_REMINDER_LEAD_HOURS,
  cadenceHours: number = DISPATCHER_CADENCE_HOURS
): ReminderWindow {
  const start = new Date(now.getTime() + leadHours * HOUR_MS);
  const end = new Date(start.getTime() + cadenceHours * HOUR_MS);
  return { start, end };
}
