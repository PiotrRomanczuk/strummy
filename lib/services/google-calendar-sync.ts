import { createAdminClient } from '@/lib/supabase/admin';
import { matchStudentByEmail, createShadowStudent } from '@/lib/services/import-utils';
import { resolveStudentAttendee } from '@/lib/services/calendar-bulk-import';
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
  attendeeEmail: string;
  attendeeName?: string;
  /** Event length; null when it is not a plausible lesson length. */
  durationMinutes?: number | null;
  manualStudentId?: string; // For manual override
}

/**
 * Sync Google Calendar events into lessons using admin client.
 * Used by the webhook handler and the daily cron — no user session available.
 *
 * `teacherProfileId` is `profiles.id`, the key `lessons.teacher_id` references.
 * It is NOT the auth id that `user_integrations` is keyed by: the two differ
 * for every account created since S2, and passing the auth id here made the
 * insert fail its foreign key.
 */
export async function syncGoogleEventsForUser(teacherProfileId: string, events: ImportEvent[]) {
  const supabase = createAdminClient();
  const results = [];

  for (const event of events) {
    let studentId = event.manualStudentId;

    // If no manual override, try to match or create (pass admin client to bypass RLS)
    if (!studentId) {
      const match = await matchStudentByEmail(event.attendeeEmail, supabase);

      if (match.status === 'MATCHED') {
        studentId = match.candidates[0].id.toString();
      } else if (match.status === 'NONE' && event.attendeeName) {
        // Create shadow student
        const [firstName, ...lastNameParts] = event.attendeeName.split(' ');
        const lastName = lastNameParts.join(' ') || '';

        const createResult = await createShadowStudent(
          event.attendeeEmail,
          firstName,
          lastName,
          supabase
        );

        if (!createResult.success) {
          logger.warn('[WebhookSync] Shadow student creation failed', {
            eventId: event.googleEventId,
            email: event.attendeeEmail,
            error: createResult.error,
          });
          results.push({ eventId: event.googleEventId, success: false, error: createResult.error });
          continue;
        }

        studentId = createResult.profileId!;
      } else {
        logger.info('[WebhookSync] Skipped event — ambiguous student match', {
          eventId: event.googleEventId,
          email: event.attendeeEmail,
        });
        results.push({
          eventId: event.googleEventId,
          success: false,
          error: 'Student match ambiguous or required',
        });
        continue;
      }
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('lessons')
      .select('id')
      .eq('google_event_id', event.googleEventId)
      .single();

    if (existing) {
      results.push({ eventId: event.googleEventId, success: false, error: 'Already imported' });
      continue;
    }

    const lessonData: TablesInsert<'lessons'> = {
      student_id: studentId,
      teacher_id: teacherProfileId,
      title: event.title || 'Lesson',
      notes: event.notes,
      scheduled_at: event.startTime,
      duration_minutes: event.durationMinutes ?? null,
      google_event_id: event.googleEventId,
      status: 'SCHEDULED',
    };

    const { error } = await supabase.from('lessons').insert(lessonData);

    if (error) {
      logger.error('[WebhookSync] Lesson insert failed', {
        eventId: event.googleEventId,
        error: error.message,
      });
      results.push({ eventId: event.googleEventId, success: false, error: error.message });
    } else {
      logger.info('[WebhookSync] Lesson imported', {
        eventId: event.googleEventId,
        studentId,
      });
      results.push({ eventId: event.googleEventId, success: true });
    }
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

    // Resolve student from attendees (exclude teacher, handle parent/student)
    const importEvents: ImportEvent[] = [];
    for (const e of guitarLessons) {
      const student = await resolveStudentAttendee(
        e.attendees as Array<{ email: string; displayName?: string }>,
        teacherEmail,
        admin
      );
      if (!student?.email) {
        logger.info('[WebhookSync] Skipped event — no student attendee found', {
          eventId: e.id,
          summary: e.summary,
        });
        continue;
      }
      importEvents.push({
        googleEventId: e.id,
        title: e.summary,
        notes: e.description,
        startTime: e.start.dateTime,
        attendeeEmail: student.email,
        attendeeName: student.displayName || '',
        durationMinutes: eventDurationMinutes(e.start.dateTime, e.end?.dateTime),
      });
    }

    if (importEvents.length === 0) {
      return { success: true, count: 0, skipped: 0 };
    }

    const result = await syncGoogleEventsForUser(teacherProfile.id, importEvents);
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
