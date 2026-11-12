import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/** How far back the dashboard looks; older unanswered lessons stay on the calendar. */
const LOOKBACK_DAYS = 60;

/**
 * Number of the teacher's past lessons that still wait for a "took place /
 * did not take place" answer. `teacherProfileId` is `profiles.id`.
 */
export async function countLessonsAwaitingConfirmation(
  teacherProfileId: string,
  now: Date
): Promise<number> {
  const supabase = await createClient();
  const since = new Date(now);
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  const { count, error } = await supabase
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', teacherProfileId)
    .in('status', ['SCHEDULED', 'IN_PROGRESS'])
    .is('deleted_at', null)
    .gte('scheduled_at', since.toISOString())
    .lte('scheduled_at', now.toISOString());

  if (error) {
    logger.warn('[lesson-attendance-queries] awaiting count error', {
      error: error.message,
      code: error.code,
    });
    return 0;
  }
  return count ?? 0;
}
