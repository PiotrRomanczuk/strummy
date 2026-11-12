/**
 * Calendar Sync Service (Cron-compatible)
 *
 * Syncs Google Calendar events for every teacher with a Google integration.
 * Runs with the admin client (no user session), before the student status
 * check, so that check sees fresh lessons.
 *
 * The per-teacher work is `fetchAndSyncRecentEvents` — the same function the
 * Google webhook calls. This file used to carry a second implementation that
 * wrote the auth id into `lessons.teacher_id` and created a real auth account
 * for every calendar attendee; two paths for one job is how they drifted.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAndSyncRecentEvents } from '@/lib/services/google-calendar-sync';
import { logger } from '@/lib/logger';

interface CalendarSyncResult {
  teachersSynced: number;
  lessonsImported: number;
  lessonsSkipped: number;
  errors: Array<{ teacherId: string; error: string }>;
}

export async function syncAllTeacherCalendars(): Promise<CalendarSyncResult> {
  const admin = createAdminClient();
  const result: CalendarSyncResult = {
    teachersSynced: 0,
    lessonsImported: 0,
    lessonsSkipped: 0,
    errors: [],
  };

  const { data: integrations, error } = await admin
    .from('user_integrations')
    .select('user_id')
    .eq('provider', 'google')
    .not('access_token', 'is', null);

  if (error || !integrations?.length) return result;

  for (const integration of integrations) {
    const sync = await fetchAndSyncRecentEvents(integration.user_id);
    if (!sync.success) {
      logger.error(`[CalendarSync] Teacher ${integration.user_id} failed:`, sync.error);
      result.errors.push({ teacherId: integration.user_id, error: sync.error ?? 'Unknown error' });
      continue;
    }
    result.teachersSynced++;
    result.lessonsImported += sync.count ?? 0;
    result.lessonsSkipped += sync.skipped ?? 0;
  }

  return result;
}
