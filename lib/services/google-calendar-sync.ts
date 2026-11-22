import { createAdminClient } from '@/lib/supabase/admin';
import {
  MANUAL_REASON_TEXT,
  resolveLessonStudent,
  type CalendarAttendee,
} from '@/lib/services/calendar-attendee';
import { TablesInsert } from '@/types/database.types';
import { getCalendarEventsInRangeAdmin } from '@/lib/google';
import { eventDurationMinutes, isGuitarLesson } from '@/lib/calendar/calendar-utils';
import { logger } from '@/lib/logger';

const LOOKBACK_DAYS = 14;
const LOOKAHEAD_DAYS = 30;

export interface ImportEvent {
  googleEventId: string;
  title: string;
  notes?: string;
  startTime: string;
  /** Everyone on the event; resolveLessonStudent picks the student. */
  attendees: CalendarAttendee[];
  /** Event length; null when it is not a plausible lesson length. */
  durationMinutes?: number | null;
  manualStudentId?: string; // For manual override
}

type ImportResult = { eventId: string; success: boolean; error?: string };
type Admin = ReturnType<typeof createAdminClient>;

async function importEvent(
  supabase: Admin,
  teacher: { profileId: string; email: string },
  event: ImportEvent
): Promise<ImportResult> {
  const eventId = event.googleEventId;
  const { data: existing } = await supabase
    .from('lessons')
    .select('id')
    .eq('google_event_id', eventId)
    .single();
  if (existing) return { eventId, success: false, error: 'Already imported' };

  let studentId = event.manualStudentId;
  if (!studentId) {
    const match = await resolveLessonStudent(event.attendees, teacher.email, supabase);
    if (!match.ok) {
      logger.info('[WebhookSync] Event left for the teacher to assign', {
        eventId,
        reason: match.reason,
        error: match.error,
      });
      return { eventId, success: false, error: MANUAL_REASON_TEXT[match.reason] };
    }
    studentId = match.studentId;
  }

  const lessonData: TablesInsert<'lessons'> = {
    student_id: studentId,
    teacher_id: teacher.profileId,
    title: event.title || 'Lesson',
    notes: event.notes,
    scheduled_at: event.startTime,
    duration_minutes: event.durationMinutes ?? null,
    google_event_id: eventId,
    status: 'SCHEDULED',
  };
  const { error } = await supabase.from('lessons').insert(lessonData);
  if (error) {
    logger.error('[WebhookSync] Lesson insert failed', { eventId, error: error.message });
    return { eventId, success: false, error: error.message };
  }
  logger.info('[WebhookSync] Lesson imported', { eventId, studentId });
  return { eventId, success: true };
}

/**
 * Sync Google Calendar events into lessons using admin client.
 * Used by the webhook handler and the daily cron — no user session available.
 *
 * `teacher.profileId` is `profiles.id`, the key `lessons.teacher_id` references.
 * It is NOT the auth id that `user_integrations` is keyed by: the two differ
 * for every account created since S2, and passing the auth id here made the
 * insert fail its foreign key. `teacher.email` keeps the teacher out of the
 * attendee match.
 */
export async function syncGoogleEventsForUser(
  teacher: { profileId: string; email: string },
  events: ImportEvent[]
) {
  const supabase = createAdminClient();
  const results: ImportResult[] = [];
  for (const event of events) {
    results.push(await importEvent(supabase, teacher, event));
  }
  return { success: true, results };
}

/**
 * Fetch recent Google Calendar events and sync them as lessons.
 * Uses admin client throughout — called from the webhook handler and the daily
 * cron (no user session). `userId` is the auth id `user_integrations` is keyed by.
 * Includes a 14-day lookback so a lesson that already happened still arrives,
 * as SCHEDULED, for the teacher to confirm.
 */
export async function fetchAndSyncRecentEvents(userId: string) {
  const admin = createAdminClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - LOOKBACK_DAYS);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + LOOKAHEAD_DAYS);

  try {
    // Look up teacher email to exclude from attendees
    const { data: teacherProfile } = await admin
      .from('profiles')
      .select('id, email')
      .eq('user_id', userId)
      .single();
    if (!teacherProfile) {
      logger.error('[WebhookSync] No profile for the connected Google account', { userId });
      return { success: false, error: 'Teacher profile not found' };
    }
    const teacherEmail = teacherProfile.email || '';

    const googleEvents = await getCalendarEventsInRangeAdmin(userId, startDate, endDate);
    logger.info('[WebhookSync] Fetched Google Calendar events', {
      userId,
      teacherEmail,
      totalEvents: googleEvents.length,
      window: `${LOOKBACK_DAYS}d back / ${LOOKAHEAD_DAYS}d forward`,
    });

    const guitarLessons = googleEvents.filter(
      (e) => isGuitarLesson(e) && e.attendees && e.attendees.length > 0
    );
    logger.info('[WebhookSync] Filtered guitar lessons', {
      userId,
      guitarLessons: guitarLessons.length,
      filtered: googleEvents.length - guitarLessons.length,
    });

    const importEvents: ImportEvent[] = guitarLessons.map((e) => ({
      googleEventId: e.id,
      title: e.summary,
      notes: e.description,
      startTime: e.start.dateTime,
      attendees: e.attendees ?? [],
      durationMinutes: eventDurationMinutes(e.start.dateTime, e.end?.dateTime),
    }));

    if (importEvents.length === 0) {
      return { success: true, count: 0, skipped: 0 };
    }

    const result = await syncGoogleEventsForUser(
      { profileId: teacherProfile.id, email: teacherEmail },
      importEvents
    );
    const imported = result.results.filter((r) => r.success).length;
    const skipped = result.results.filter((r) => !r.success).length;

    logger.info('[WebhookSync] Sync complete', {
      userId,
      imported,
      skipped,
    });

    return {
      success: true,
      count: imported,
      skipped,
      details: result,
    };
  } catch (error) {
    logger.error('[WebhookSync] Error syncing events:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
