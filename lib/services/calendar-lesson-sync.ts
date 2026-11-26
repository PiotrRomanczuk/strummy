/**
 * Service for syncing lessons with Google Calendar
 * Handles bidirectional sync between Strummy lessons and Google Calendar events
 */

import { createClient } from '@/lib/supabase/server';
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from '@/lib/google';
import { logger } from '@/lib/logger';

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

interface LessonData {
  id: string;
  title: string;
  scheduled_at: string;
  notes?: string | null;
  student_id: string;
  teacher_id: string;
  google_event_id?: string | null;
  status?: string;
}

/**
 * Check if a user has Google Calendar integration enabled
 */
export async function hasGoogleIntegration(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_integrations')
    .select('access_token')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .single();

  return !error && !!data?.access_token;
}

/**
 * The auth id whose Google account receives this teacher's lessons, or null
 * when the teacher has not connected one. `lessons.teacher_id` is a profile
 * id, while `user_integrations` and the Google client are keyed by the auth
 * id — the two differ for every account created since S2, so passing the
 * profile id found no integration and nothing ever reached the calendar.
 */
export async function connectedGoogleUser(
  supabase: SupabaseClient,
  teacherProfileId: string
): Promise<string | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('id', teacherProfileId)
    .single();
  if (!profile?.user_id) return null;
  return (await hasGoogleIntegration(supabase, profile.user_id)) ? profile.user_id : null;
}

/**
 * Get student email for Google Calendar attendee
 */
async function getStudentEmail(
  supabase: SupabaseClient,
  studentId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', studentId)
    .single();

  if (error || !data) {
    logger.error('Failed to fetch student email:', error);
    return null;
  }

  return data.email;
}

/**
 * Sync a newly created lesson to Google Calendar
 * Creates a Google Calendar event and stores the event ID
 */
export async function syncLessonCreation(
  supabase: SupabaseClient,
  lessonData: LessonData
): Promise<void> {
  try {
    const googleUser = await connectedGoogleUser(supabase, lessonData.teacher_id);
    if (!googleUser) return; // No Google Calendar connected

    // Get student email
    const studentEmail = await getStudentEmail(supabase, lessonData.student_id);
    if (!studentEmail) {
      logger.warn('Cannot sync lesson to Google Calendar: student has no email');
      return;
    }

    // Create Google Calendar event
    const { eventId } = await createGoogleCalendarEvent(googleUser, {
      title: lessonData.title,
      scheduled_at: lessonData.scheduled_at,
      notes: lessonData.notes || undefined,
      student_email: studentEmail,
    });

    // Update lesson with Google event ID
    await supabase.from('lessons').update({ google_event_id: eventId }).eq('id', lessonData.id);

    // Lesson synced to Google Calendar
  } catch (error) {
    // Log error but don't fail the lesson creation
    logger.error('Failed to sync lesson to Google Calendar:', error);
  }
}

/**
 * Sync lesson updates to Google Calendar
 * Updates the corresponding Google Calendar event if it exists
 */
export async function syncLessonUpdate(
  supabase: SupabaseClient,
  lessonData: LessonData,
  updates: {
    title?: string;
    scheduled_at?: string;
    notes?: string | null;
  }
): Promise<void> {
  try {
    // Only sync if lesson has a Google event ID
    if (!lessonData.google_event_id) {
      return;
    }

    const googleUser = await connectedGoogleUser(supabase, lessonData.teacher_id);
    if (!googleUser) return;

    await updateGoogleCalendarEvent(googleUser, lessonData.google_event_id, {
      title: updates.title,
      scheduled_at: updates.scheduled_at,
      notes: updates.notes || undefined,
    });

    // Lesson updated in Google Calendar
  } catch (error) {
    // Log error but don't fail the lesson update
    logger.error('Failed to update Google Calendar event:', error);
  }
}

/**
 * Sync lesson deletion to Google Calendar
 * Deletes the corresponding Google Calendar event if it exists
 */
export async function syncLessonDeletion(
  supabase: SupabaseClient,
  lessonId: string
): Promise<void> {
  try {
    // Fetch lesson to get Google event ID and teacher ID
    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('google_event_id, teacher_id')
      .eq('id', lessonId)
      .single();

    if (error || !lesson) {
      return; // Lesson doesn't exist or error occurred
    }

    if (!lesson.google_event_id) {
      return; // No Google Calendar event to delete
    }

    const googleUser = await connectedGoogleUser(supabase, lesson.teacher_id);
    if (!googleUser) return;

    await deleteGoogleCalendarEvent(googleUser, lesson.google_event_id);

    // Lesson deleted from Google Calendar
  } catch (error) {
    // Log error but don't fail the lesson deletion
    logger.error('Failed to delete Google Calendar event:', error);
  }
}
