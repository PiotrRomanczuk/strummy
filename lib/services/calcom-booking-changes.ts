import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import type { CalcomReschedulePayload } from '@/schemas/CalcomWebhookSchema';
import {
  calcomDurationMinutes,
  processCalcomBookingPayload,
  type CalcomBookingPayload,
  type CalcomBookingResult,
} from './calcom';

const log = createLogger('calcom');

type AdminClient = ReturnType<typeof createAdminClient>;

export interface CalcomChangeResult {
  success: true;
  action: 'cancelled' | 'rescheduled' | 'unchanged';
  lessonId: string | null;
}

/**
 * Marks the SCHEDULED lesson of booking `uid` as CANCELLED. Idempotent: a
 * repeated event, an unknown uid or a lesson that already took place changes
 * nothing.
 */
async function cancelLessonByBookingUid(admin: AdminClient, uid: string): Promise<string | null> {
  const { data, error } = await admin
    .from('lessons')
    .update({ status: 'CANCELLED' })
    .eq('calcom_booking_id', uid)
    .eq('status', 'SCHEDULED')
    .is('deleted_at', null)
    .select('id');

  if (error) {
    log.error('Error cancelling lesson for Cal.com booking:', error);
    throw new Error('Cal.com webhook: could not cancel lesson');
  }
  return data?.[0]?.id ?? null;
}

export async function cancelCalcomBooking(uid: string): Promise<CalcomChangeResult> {
  const lessonId = await cancelLessonByBookingUid(createAdminClient(), uid);
  return { success: true, action: lessonId ? 'cancelled' : 'unchanged', lessonId };
}

async function findLessonIdByBookingUid(admin: AdminClient, uid: string): Promise<string | null> {
  const { data } = await admin
    .from('lessons')
    .select('id')
    .eq('calcom_booking_id', uid)
    .is('deleted_at', null)
    .maybeSingle();
  return data?.id ?? null;
}

/** Moves the old booking's SCHEDULED lesson to the new slot and the new uid. */
async function moveLesson(
  admin: AdminClient,
  change: CalcomReschedulePayload
): Promise<string | null> {
  const { data, error } = await admin
    .from('lessons')
    .update({
      scheduled_at: change.startTime,
      duration_minutes: calcomDurationMinutes(change.startTime, change.endTime),
      calcom_booking_id: change.uid,
    })
    .eq('calcom_booking_id', change.rescheduleUid)
    .eq('status', 'SCHEDULED')
    .is('deleted_at', null)
    .select('id');

  if (error) {
    log.error('Error moving lesson for rescheduled Cal.com booking:', error);
    throw new Error('Cal.com webhook: could not reschedule lesson');
  }
  return data?.[0]?.id ?? null;
}

/**
 * BOOKING_RESCHEDULED: Cal.com replaces booking `rescheduleUid` with a new
 * booking `uid`. The existing lesson moves; no second lesson is created.
 * - The new uid already has a lesson (repeated event, or it arrived as a new
 *   booking first): keep it, cancel the old one if it is still scheduled.
 * - Otherwise move the old booking's lesson to the new slot.
 * - No lesson for either uid (booked before the webhook existed): the new
 *   booking is handled like BOOKING_CREATED.
 */
export async function rescheduleCalcomBooking(
  change: CalcomReschedulePayload,
  payload: CalcomBookingPayload
): Promise<CalcomChangeResult | CalcomBookingResult> {
  const admin = createAdminClient();

  const existingId = await findLessonIdByBookingUid(admin, change.uid);
  if (existingId) {
    await cancelLessonByBookingUid(admin, change.rescheduleUid);
    return { success: true, action: 'unchanged', lessonId: existingId };
  }

  const movedId = await moveLesson(admin, change);
  if (movedId) return { success: true, action: 'rescheduled', lessonId: movedId };

  return processCalcomBookingPayload({ ...payload, uid: change.uid });
}
