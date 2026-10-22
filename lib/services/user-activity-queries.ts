import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export type StudentActivity = {
  /** Songs in the student's repertoire. */
  songs: number;
  /** Days since any repertoire song was last practised; null = never. */
  daysSincePractice: number | null;
};

const DAY_MS = 86_400_000;

/**
 * Repertoire size and practice recency per student, for list surfaces that
 * show a student as more than a name and an e-mail (the People list). One
 * query for the whole page, RLS-bound like the list itself; a failure degrades
 * to "no activity" rather than hiding anyone.
 */
export async function getStudentActivity(
  studentIds: string[],
  now: Date
): Promise<Map<string, StudentActivity>> {
  const out = new Map<string, StudentActivity>();
  if (studentIds.length === 0) return out;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('student_repertoire')
    .select('student_id, last_practiced_at')
    .in('student_id', studentIds);
  if (error) {
    logger.warn('[user-activity-queries] repertoire error', { error: error.message });
    return out;
  }
  for (const row of data ?? []) {
    const id = row.student_id as string;
    const current = out.get(id) ?? { songs: 0, daysSincePractice: null };
    const at = row.last_practiced_at ? Date.parse(row.last_practiced_at as string) : NaN;
    const days = Number.isFinite(at) ? Math.floor((now.getTime() - at) / DAY_MS) : null;
    out.set(id, {
      songs: current.songs + 1,
      daysSincePractice:
        days === null
          ? current.daysSincePractice
          : current.daysSincePractice === null
            ? days
            : Math.min(current.daysSincePractice, days),
    });
  }
  return out;
}
