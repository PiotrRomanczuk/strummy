/**
 * Pure, DB-free helpers for the student-health surfaces (student dashboard,
 * parent "Family portal"). No server imports, so they are safe to unit-test in
 * isolation and to pull into client bundles.
 */

export type PracticeDay = {
  /** ISO calendar day, e.g. '2026-07-23' (UTC bucket). */
  date: string;
  /** Short weekday, e.g. 'Wed'. */
  label: string;
  minutes: number;
  hasPractice: boolean;
};

export type PracticeWeek = {
  totalMinutes: number;
  activeDays: number;
  goalPerDay: number;
  weeklyGoal: number;
  onTrack: boolean;
};

export type PracticeSessionRow = {
  createdAt: string | null;
  minutes: number;
};

export const DEFAULT_DAILY_GOAL_MINUTES = 20;

/**
 * A week counts as "on track" once logged minutes reach this fraction of the
 * full weekly goal — practice is bursty, so demanding 100% every week reads as
 * "needs attention" far too often.
 */
export const PRACTICE_ON_TRACK_RATIO = 0.7;

const dayKey = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * Bucket raw practice sessions into a fixed `days`-long window ending today
 * (oldest first). Days with no logged practice appear with minutes = 0.
 */
export function bucketPracticeDays(
  sessions: PracticeSessionRow[],
  now: Date,
  days = 7
): PracticeDay[] {
  const totals = new Map<string, number>();
  for (const session of sessions) {
    if (!session.createdAt) continue;
    const key = dayKey(new Date(session.createdAt));
    totals.set(key, (totals.get(key) ?? 0) + Math.max(0, session.minutes));
  }

  const out: PracticeDay[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - offset);
    const key = dayKey(d);
    const minutes = totals.get(key) ?? 0;
    out.push({
      date: key,
      label: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      minutes,
      hasPractice: minutes > 0,
    });
  }
  return out;
}

export function summarisePracticeWeek(
  days: PracticeDay[],
  goalPerDay = DEFAULT_DAILY_GOAL_MINUTES
): PracticeWeek {
  const totalMinutes = days.reduce((sum, d) => sum + d.minutes, 0);
  const activeDays = days.filter((d) => d.hasPractice).length;
  const weeklyGoal = goalPerDay * days.length;
  const onTrack =
    weeklyGoal === 0 ? true : totalMinutes >= Math.round(weeklyGoal * PRACTICE_ON_TRACK_RATIO);
  return { totalMinutes, activeDays, goalPerDay, weeklyGoal, onTrack };
}

/** Consecutive days, ending on the most recent day, that have logged practice. */
export function currentStreak(days: PracticeDay[]): number {
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (!days[i].hasPractice) break;
    streak++;
  }
  return streak;
}

/** "45m", "1h", "2h 10m" — raw minute counts read badly past the first hour. */
export const formatPracticeMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};
