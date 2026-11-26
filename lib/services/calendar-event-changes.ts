import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import type { Database } from '@/types/database.types';

/**
 * What a change in Google Calendar does to a lesson imported from it (#1135).
 *
 * Only a lesson that is still SCHEDULED follows its event: once the teacher
 * has run, completed or cancelled it in Strummy, that record wins over the
 * calendar. The later write wins too: a lesson saved in Strummy after the
 * event's last change keeps its time, because the push of that edit to Google
 * may have failed and following the stale event would undo it. A moved event
 * moves the lesson; a deleted or cancelled event (Calendly cancels the old
 * event when a student reschedules) cancels it.
 */

type Admin = SupabaseClient<Database>;

export type ImportedLesson = {
  id: string;
  status: Database['public']['Enums']['lesson_status'];
  scheduled_at: string;
  duration_minutes: number | null;
  updated_at: string;
};

export type EventState = {
  startTime: string;
  durationMinutes: number | null;
  /** The event's last change; unknown → the event is taken as the newer. */
  updatedAt?: string | null;
};

export type LessonChange =
  { kind: 'none' } | { kind: 'reschedule'; scheduledAt: string; durationMinutes: number | null };

/** The update a still-existing event asks of its lesson. */
export function lessonChangeFor(lesson: ImportedLesson, event: EventState): LessonChange {
  if (lesson.status !== 'SCHEDULED') return { kind: 'none' };
  const isLessonNewer =
    !!event.updatedAt && new Date(lesson.updated_at) > new Date(event.updatedAt);
  if (isLessonNewer) return { kind: 'none' };
  const isMoved = new Date(lesson.scheduled_at).getTime() !== new Date(event.startTime).getTime();
  const isResized =
    event.durationMinutes !== null && event.durationMinutes !== lesson.duration_minutes;
  if (!isMoved && !isResized) return { kind: 'none' };
  return {
    kind: 'reschedule',
    scheduledAt: event.startTime,
    durationMinutes: event.durationMinutes ?? lesson.duration_minutes,
  };
}

/** Apply a moved event to its lesson; true when the lesson changed. */
export async function applyLessonChange(
  admin: Admin,
  lesson: ImportedLesson,
  event: EventState
): Promise<boolean> {
  const change = lessonChangeFor(lesson, event);
  if (change.kind === 'none') return false;
  const { error } = await admin
    .from('lessons')
    .update({ scheduled_at: change.scheduledAt, duration_minutes: change.durationMinutes })
    .eq('id', lesson.id)
    .eq('status', 'SCHEDULED');
  if (error) {
    logger.error('[WebhookSync] Lesson reschedule failed', {
      lessonId: lesson.id,
      error: error.message,
    });
    return false;
  }
  logger.info('[WebhookSync] Lesson follows its moved event', { lessonId: lesson.id });
  return true;
}

/**
 * Cancel this teacher's SCHEDULED lessons whose calendar events were deleted
 * or cancelled. Returns how many lessons changed.
 */
export async function cancelLessonsForEvents(
  admin: Admin,
  teacherProfileId: string,
  googleEventIds: string[]
): Promise<number> {
  if (googleEventIds.length === 0) return 0;
  const { data, error } = await admin
    .from('lessons')
    .update({ status: 'CANCELLED' })
    .eq('teacher_id', teacherProfileId)
    .eq('status', 'SCHEDULED')
    .in('google_event_id', googleEventIds)
    .is('deleted_at', null)
    .select('id');
  if (error) {
    logger.error('[WebhookSync] Lesson cancel failed', { error: error.message });
    return 0;
  }
  if (data.length > 0)
    logger.info('[WebhookSync] Lessons cancelled with their events', { count: data.length });
  return data.length;
}
