import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

const log = createLogger('calcom');

export interface CalcomAttendee {
  name: string;
  email: string;
}

export interface CalcomBookingPayload {
  triggerEvent: string;
  uid?: string;
  startTime: string;
  endTime?: string;
  title?: string;
  description?: string;
  attendees: CalcomAttendee[];
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

export async function processCalcomBookingPayload(
  payload: CalcomBookingPayload
): Promise<CalcomBookingResult> {
  const attendee = payload.attendees[0];
  if (!attendee?.email) {
    throw new Error('Cal.com webhook missing attendee email');
  }

  const admin = createAdminClient();
  const email = attendee.email.trim().toLowerCase();

  const { data: teacherRole } = await admin
    .from('user_roles')
    .select('user_id:profile_id')
    .in('role', ['teacher', 'admin'])
    .limit(1)
    .maybeSingle();

  if (!teacherRole) {
    throw new Error('Cal.com webhook: no teacher profile found to assign the lesson to');
  }
  const teacherId = teacherRole.user_id;

  const { data: existingProfile } = await admin
    .from('profiles')
    .select('id')
    .or(`email.eq.${email},invite_email.eq.${email}`)
    .maybeSingle();

  let studentId = existingProfile?.id;

  if (!studentId) {
    const { data: created, error: createError } = await admin
      .from('profiles')
      .insert({
        full_name: attendee.name,
        invite_email: email,
        is_shadow: true,
        is_student: true,
        student_status: 'active',
      })
      .select('id')
      .single();

    if (createError || !created) {
      log.error('Error creating shadow student for Cal.com booking:', createError);
      throw new Error('Cal.com webhook: could not create student profile');
    }
    studentId = created.id;
  }

  const { data: existingLesson } = await admin
    .from('lessons')
    .select('id')
    .eq('calcom_booking_id', payload.uid ?? '')
    .maybeSingle();

  if (existingLesson) {
    return {
      success: true,
      action: 'created',
      lessonId: existingLesson.id,
      studentId,
    };
  }

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

  return {
    success: true,
    action: 'created',
    lessonId: lesson.id,
    studentId,
  };
}
