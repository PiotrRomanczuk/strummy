import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { extractIntakeAnswers, resolveStudentId } from './calcom-intake.helpers';
import { cancelLessonByBooking, durationMinutes, moveLessonByBooking } from './calcom-lifecycle.helpers';
import { sendPreLessonEmail } from './calcom-pre-lesson.helpers';

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
  /** BOOKING_RESCHEDULED only: the uid of the booking being moved. */
  rescheduleUid?: string;
  startTime: string;
  endTime?: string;
  title?: string;
  description?: string;
  attendees: CalcomAttendee[];
  responses?: Record<string, CalcomBookingResponse>;
}

export type CalcomBookingResult =
  | { success: true; action: 'created'; lessonId: string; studentId: string }
  | { success: true; action: 'cancelled' | 'rescheduled'; lessonId: string }
  | { success: true; action: 'ignored'; reason: string };

/** No secret configured means signature checking is off (dev/local). */
export function verifyCalcomSignature(
  rawBody: string,
  signature: string | null,
  secret: string | undefined
): boolean {
  if (!secret) return true;
  if (!signature) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return signature === expected;
}

async function resolveLessonId(
  admin: ReturnType<typeof createAdminClient>,
  teacherId: string,
  studentId: string,
  payload: CalcomBookingPayload
): Promise<{ id: string; isNew: boolean }> {
  const { data: existingLesson } = await admin
    .from('lessons')
    .select('id')
    .eq('calcom_booking_id', payload.uid ?? '')
    .maybeSingle();

  if (existingLesson) return { id: existingLesson.id, isNew: false };

  const { data: lesson, error: lessonError } = await admin
    .from('lessons')
    .insert({
      teacher_id: teacherId,
      student_id: studentId,
      scheduled_at: payload.startTime,
      duration_minutes: durationMinutes(payload.startTime, payload.endTime),
      calcom_booking_id: payload.uid,
      status: 'SCHEDULED',
    })
    .select('id')
    .single();

  if (lessonError || !lesson) {
    log.error('Error creating lesson from Cal.com booking:', lessonError);
    throw new Error('Cal.com webhook: could not create lesson');
  }
  return { id: lesson.id, isNew: true };
}

/** Cancel and reschedule touch an existing lesson; only a new booking creates one. */
export async function processCalcomBookingPayload(
  payload: CalcomBookingPayload
): Promise<CalcomBookingResult> {
  if (payload.triggerEvent === 'BOOKING_CANCELLED') {
    const lessonId = payload.uid ? await cancelLessonByBooking(createAdminClient(), payload.uid) : null;
    return lessonId
      ? { success: true, action: 'cancelled', lessonId }
      : { success: true, action: 'ignored', reason: 'no scheduled lesson for this booking' };
  }

  if (payload.triggerEvent === 'BOOKING_RESCHEDULED') {
    const lessonId =
      payload.rescheduleUid && payload.uid
        ? await moveLessonByBooking(createAdminClient(), {
            previousUid: payload.rescheduleUid,
            uid: payload.uid,
            startTime: payload.startTime,
            endTime: payload.endTime,
          })
        : null;
    if (lessonId) return { success: true, action: 'rescheduled', lessonId };
    // The original booking predates the webhook — import the new time as a fresh booking.
    return createFromBooking(payload);
  }

  if (payload.triggerEvent !== 'BOOKING_CREATED') {
    log.info(`Ignoring Cal.com event ${payload.triggerEvent}`);
    return { success: true, action: 'ignored', reason: `unhandled event ${payload.triggerEvent}` };
  }

  return createFromBooking(payload);
}

async function createFromBooking(payload: CalcomBookingPayload): Promise<CalcomBookingResult> {
  const attendee = payload.attendees[0];
  if (!attendee?.email) {
    throw new Error('Cal.com webhook missing attendee email');
  }

  const admin = createAdminClient();
  const email = attendee.email.trim().toLowerCase();
  const intake = extractIntakeAnswers(payload.responses);

  const { data: teacherRole } = await admin
    .from('user_roles')
    .select('user_id:profile_id')
    .in('role', ['teacher', 'admin'])
    .limit(1)
    .maybeSingle();

  if (!teacherRole) {
    throw new Error('Cal.com webhook: no teacher profile found to assign the lesson to');
  }

  const studentId = await resolveStudentId(admin, attendee, email, intake);
  const lesson = await resolveLessonId(admin, teacherRole.user_id, studentId, payload);
  // A retried webhook finds the existing lesson and must not mail the student twice.
  if (lesson.isNew) {
    await sendPreLessonEmail(admin, studentId, {
      email,
      name: attendee.name,
      startTime: payload.startTime,
      skillLevel: intake.skillLevel,
    });
  }
  const lessonId = lesson.id;

  return { success: true, action: 'created', lessonId, studentId };
}
