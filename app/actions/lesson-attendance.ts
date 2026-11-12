'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { createLogger } from '@/lib/logger';
import { LessonAttendanceSchema, type AttendanceOutcome } from '@/schemas/LessonAttendanceSchema';

const log = createLogger('lesson-attendance');

type AttendanceResult = { lessonId: string } | { error: string };

const OUTCOME_STATUS = { held: 'COMPLETED', not_held: 'CANCELLED' } as const;

/** Statuses a lesson can be in while it still waits for the teacher's answer. */
const UNCONFIRMED_STATUSES = ['SCHEDULED', 'IN_PROGRESS'];

/**
 * Record whether a past lesson took place. A no-show and a cancellation are the
 * same answer here (owner decision 2026-11-12: neither is charged), so there
 * are two outcomes, not three.
 *
 * The update is conditional on the lesson still being unconfirmed and already
 * started: a second click, or a click on a lesson that was rescheduled into the
 * future in another tab, changes nothing instead of overwriting an answer.
 * RLS decides whose lessons the caller may touch.
 */
export async function confirmLessonAttendance(
  lessonId: string,
  outcome: AttendanceOutcome
): Promise<AttendanceResult> {
  const { user, isAdmin, isTeacher, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };
  if (!user) return { error: 'Unauthorized' };
  if (!isAdmin && !isTeacher) return { error: 'Only teachers and admins can confirm lessons' };

  const parsed = LessonAttendanceSchema.safeParse({ lessonId, outcome });
  if (!parsed.success) return { error: 'Invalid request' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .update({ status: OUTCOME_STATUS[parsed.data.outcome] })
    .eq('id', parsed.data.lessonId)
    .in('status', UNCONFIRMED_STATUSES)
    .lte('scheduled_at', new Date().toISOString())
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();

  if (error) {
    log.error('Failed to confirm lesson attendance', { error });
    return { error: error.message };
  }
  if (!data) return { error: 'Lesson is not awaiting confirmation' };

  revalidatePath('/dashboard/calendar');
  revalidatePath('/dashboard/lessons');
  revalidatePath(`/dashboard/lessons/${parsed.data.lessonId}`);
  revalidatePath('/dashboard');
  return { lessonId: parsed.data.lessonId };
}
