/**
 * Notification queue backlog — how late is the oldest mail that should have gone out?
 *
 * The queue is drained by `/api/cron/process-notification-queue`: once a day by
 * the Vercel dispatcher and every 10 minutes by the uwh timer
 * (`scripts/ops/notification-queue/`). A row still `pending` an hour after its
 * `scheduled_for` means the frequent trigger is not running, or a batch keeps
 * failing. Rows scheduled for later (a recap "1 hour after the lesson") are not
 * late, so age is measured from `scheduled_for`, not `created_at`.
 *
 * The route returns this summary after draining; the timer's script fails the
 * unit when `isStale` is true, and the unit's OnFailure= sends the mail.
 */

import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

export const QUEUE_BACKLOG_ALARM_MINUTES = 60;

const MINUTE_MS = 60 * 1000;

export interface QueueBacklog {
  /** Pending rows whose scheduled_for is more than the alarm threshold ago. */
  overdue: number;
  /** scheduled_for of the oldest such row, or null when there is none. */
  oldestDueAt: string | null;
  /** Whole minutes the oldest row is past its scheduled_for, or null. */
  oldestAgeMinutes: number | null;
  isStale: boolean;
}

/** Pure: build the summary from the oldest overdue row and the overdue count. */
export function summarizeBacklog(
  overdue: number,
  oldestDueAt: string | null,
  now: Date = new Date()
): QueueBacklog {
  if (overdue <= 0 || !oldestDueAt) {
    return { overdue: 0, oldestDueAt: null, oldestAgeMinutes: null, isStale: false };
  }
  const dueMs = Date.parse(oldestDueAt);
  const ageMinutes = Number.isNaN(dueMs)
    ? null
    : Math.max(0, Math.floor((now.getTime() - dueMs) / MINUTE_MS));
  return { overdue, oldestDueAt, oldestAgeMinutes: ageMinutes, isStale: true };
}

/** The cut-off: rows due at or before this instant are overdue. */
export function backlogCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() - QUEUE_BACKLOG_ALARM_MINUTES * MINUTE_MS).toISOString();
}

/**
 * Read the backlog. Throws on a query error: the caller reports it as a failed
 * run, so an unreadable queue alarms instead of passing as "no backlog".
 */
export async function readQueueBacklog(now: Date = new Date()): Promise<QueueBacklog> {
  const supabase = createAdminClient();
  const { data, count, error } = await supabase
    .from('notification_queue')
    .select('scheduled_for', { count: 'exact' })
    .eq('status', 'pending')
    .lte('scheduled_for', backlogCutoff(now))
    .order('scheduled_for', { ascending: true })
    .limit(1);

  if (error) throw new Error(`queue backlog query failed: ${error.message}`);
  return summarizeBacklog(count ?? 0, data?.[0]?.scheduled_for ?? null, now);
}
