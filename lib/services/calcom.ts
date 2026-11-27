import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { parseCalcomEmail } from '@/schemas/CalcomWebhookSchema';
import { extractIntakeAnswers, resolveStudentId } from './calcom-intake.helpers';
import { resolveCalcomTeacherId } from './calcom-teacher';

const log = createLogger('calcom');

export interface CalcomAttendee {
  name: string;
  email: string;
  phoneNumber?: string;
}

export interface CalcomBookingResponse {
  label?: string;
  value: unknown;
}

export interface CalcomBookingPayload {
  triggerEvent: string;
  uid?: string;
  /** BOOKING_RESCHEDULED only: the uid of the booking this one replaces. */
  rescheduleUid?: string;
  startTime: string;
  endTime?: string;
  title?: string;
  description?: string;
  attendees: CalcomAttendee[];
  responses?: Record<string, CalcomBookingResponse>;
}

export interface CalcomBookingResult {
  success: true;
  action: 'created';
  lessonId: string;
  studentId: string;
}

/**
 * Fails closed: no secret or no signature means the request is rejected. The
 * comparison is constant-time and only runs on buffers of equal length.
 */
export function verifyCalcomSignature(
  rawBody: string,
  signature: string | null,
  secret: string | undefined
): boolean {
  if (!secret || !signature) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest();
  const received = Buffer.from(signature, 'hex');
  if (received.length !== expected.length) return false;
  return crypto.timingSafeEqual(received, expected);
}

/** The booking page sells 60-minute lessons; used when Cal.com sends no `endTime`. */
export const CALCOM_DEFAULT_DURATION_MINUTES = 60;

export function calcomDurationMinutes(startTime: string, endTime?: string): number {
  if (!endTime) return CALCOM_DEFAULT_DURATION_MINUTES;
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return CALCOM_DEFAULT_DURATION_MINUTES;
  return Math.round(ms / 60_000);
}

async function resolveLessonId(
  admin: ReturnType<typeof createAdminClient>,
  teacherId: string,
  studentId: string,
  payload: CalcomBookingPayload
): Promise<string> {
  const { data: existingLesson } = await admin
    .from('lessons')
    .select('id')
    .eq('calcom_booking_id', payload.uid ?? '')
    .maybeSingle();

  if (existingLesson) return existingLesson.id;

  const { data: lesson, error: lessonError } = await admin
    .from('lessons')
    .insert({
      teacher_id: teacherId,
      student_id: studentId,
      scheduled_at: payload.startTime,
      duration_minutes: calcomDurationMinutes(payload.startTime, payload.endTime),
      calcom_booking_id: payload.uid,
      status: 'SCHEDULED',
    })
    .select('id')
    .single();

  if (lessonError || !lesson) {
    log.error('Error creating lesson from Cal.com booking:', lessonError);
    throw new Error('Cal.com webhook: could not create lesson');
  }
  return lesson.id;
}

export async function processCalcomBookingPayload(
  payload: CalcomBookingPayload
): Promise<CalcomBookingResult> {
  const attendee = payload.attendees?.[0];
  const email = parseCalcomEmail(attendee?.email);
  if (!attendee || !email) {
    throw new Error('Cal.com webhook missing or invalid attendee email');
  }

  const admin = createAdminClient();
  const intake = extractIntakeAnswers(payload.responses);

  const teacherId = await resolveCalcomTeacherId(admin);
  const studentId = await resolveStudentId(admin, attendee, email, intake);
  const lessonId = await resolveLessonId(admin, teacherId, studentId, payload);

  return { success: true, action: 'created', lessonId, studentId };
}
