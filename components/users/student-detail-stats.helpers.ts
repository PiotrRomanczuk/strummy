import type { StudentRecentLesson } from '@/lib/services/student-detail-queries';
import type { PracticeDay } from '@/lib/services/student-health.helpers';

/** Consecutive days with practice, counting back from today (or yesterday). */
export const practiceStreak = (days: PracticeDay[], now: Date = new Date()): number => {
  const byDate = new Map(days.map((d) => [d.date, d.minutes]));
  const cursor = new Date(now);
  const key = () => cursor.toISOString().slice(0, 10);
  if (!byDate.get(key())) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while ((byDate.get(key()) ?? 0) > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

/** Share of past lessons that happened (completed vs completed + cancelled + missed). */
export const attendancePct = (
  lessons: StudentRecentLesson[],
  now: Date = new Date()
): number | null => {
  const past = lessons.filter((l) => Date.parse(l.scheduledAt) < now.getTime());
  if (past.length === 0) return null;
  const done = past.filter((l) => l.status.toLowerCase() === 'completed').length;
  return Math.round((done / past.length) * 100);
};

/** Minutes this week vs the week before, from a 14-day history (oldest first). */
export const weekOverWeek = (
  days: PracticeDay[]
): { thisWeek: number; deltaPct: number | null } => {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const thisWeek = sorted.slice(-7).reduce((s, d) => s + d.minutes, 0);
  const prior = sorted.slice(-14, -7).reduce((s, d) => s + d.minutes, 0);
  return { thisWeek, deltaPct: prior > 0 ? Math.round(((thisWeek - prior) / prior) * 100) : null };
};
