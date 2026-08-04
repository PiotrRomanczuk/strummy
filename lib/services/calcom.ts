import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';
import { extractIntakeAnswers, resolveStudentId } from './calcom-intake.helpers';

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

function durationMinutes(startTime: string, endTime?: string): number {
  if (!endTime) return 45;
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime();
  return Math.max(1, Math.round(ms / 60_000));
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
  return lesson.id;
}

export async function processCalcomBookingPayload(
  payload: CalcomBookingPayload
): Promise<CalcomBookingResult> {
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
  const lessonId = await resolveLessonId(admin, teacherRole.user_id, studentId, payload);

  return { success: true, action: 'created', lessonId, studentId };
}
