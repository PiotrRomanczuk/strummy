import type { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

const log = createLogger('calcom');

type AdminClient = ReturnType<typeof createAdminClient>;

/** Lesson length when Cal.com sends no endTime — the "Lekcja gitary (60 min)" event. */
export const DEFAULT_LESSON_MINUTES = 60;

export function durationMinutes(startTime: string, endTime?: string): number {
  if (!endTime) return DEFAULT_LESSON_MINUTES;
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
  return Math.max(1, Math.round(ms / 60_000));
}

/**
 * BOOKING_CANCELLED: the booking keeps its uid, so the lesson is found by it.
 * Only a still-SCHEDULED lesson is cancelled — a completed one stays as history.
 */
export async function cancelLessonByBooking(admin: AdminClient, uid: string): Promise<string | null> {
  const { data, error } = await admin
    .from('lessons')
    .update({ status: 'CANCELLED' })
    .eq('calcom_booking_id', uid)
    .eq('status', 'SCHEDULED')
    .select('id')
    .maybeSingle();

  if (error) {
    log.error('Error cancelling lesson from Cal.com booking:', error);
    throw new Error('Cal.com webhook: could not cancel lesson');
  }
  return data?.id ?? null;
}

type Reschedule = { previousUid: string; uid: string; startTime: string; endTime?: string };

/**
 * BOOKING_RESCHEDULED arrives with a NEW uid and the old one in `rescheduleUid`.
 * Moving the existing lesson (instead of creating a second one) keeps its notes and history.
 */
export async function moveLessonByBooking(admin: AdminClient, change: Reschedule): Promise<string | null> {
  const { data, error } = await admin
    .from('lessons')
    .update({
      scheduled_at: change.startTime,
      duration_minutes: durationMinutes(change.startTime, change.endTime),
      calcom_booking_id: change.uid,
    })
    .eq('calcom_booking_id', change.previousUid)
    .select('id')
    .maybeSingle();

  if (error) {
    log.error('Error rescheduling lesson from Cal.com booking:', error);
    throw new Error('Cal.com webhook: could not reschedule lesson');
  }
  return data?.id ?? null;
}
