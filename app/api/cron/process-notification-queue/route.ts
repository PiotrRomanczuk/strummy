/**
 * Cron Job: Process Notification Queue
 *
 * Sends due rows of `notification_queue`, retries failed ones, and reports the
 * backlog that is left (`lib/notifications/queue-backlog.ts`).
 *
 * Two triggers, same CRON_SECRET bearer:
 * - the daily Vercel dispatcher (06:00 UTC, `vercel.json`), which runs it last;
 * - a systemd user timer on uwh every 10 minutes
 *   (`scripts/ops/notification-queue/`), because Vercel Hobby allows one cron
 *   a day and "1 hour after the lesson" mail, cancellations and retries must
 *   not wait until the next morning.
 *
 * `backlog.isStale` is true when a row is still pending an hour after it was
 * due; the timer's script turns that into a failed unit (the alarm).
 */

import { NextResponse } from 'next/server';
import {
  processQueuedNotifications,
  retryFailedNotifications,
} from '@/lib/services/notification-queue-processor';
import { cleanupExpiredAuthEntries } from '@/lib/auth/rate-limiter';
import {
  logCronStart,
  logCronComplete,
  logCronError,
} from '@/lib/notifications/notification-logger';
import { readQueueBacklog } from '@/lib/notifications/queue-backlog';
import { verifyCronSecret } from '@/lib/auth/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const startTime = Date.now();

  try {
    logCronStart('process-notification-queue');

    // Process pending notifications from the queue
    const queueResult = await processQueuedNotifications(100); // Process up to 100 at a time

    // Also retry failed notifications
    const retryResult = await retryFailedNotifications();

    // Cleanup expired auth rate limit entries
    await cleanupExpiredAuthEntries();

    // What is still late after this run — read last, so it reflects the drain.
    const backlog = await readQueueBacklog();

    const duration = Date.now() - startTime;

    logCronComplete('process-notification-queue', duration, {
      queue_processed: queueResult.processed,
      queue_failed: queueResult.failed,
      retry_retried: retryResult.retried,
      retry_failed: retryResult.failed,
      retry_dead_lettered: retryResult.deadLettered,
      backlog_overdue: backlog.overdue,
      backlog_oldest_age_minutes: backlog.oldestAgeMinutes,
    });

    return NextResponse.json({
      success: true,
      queue: {
        processed: queueResult.processed,
        failed: queueResult.failed,
      },
      retry: {
        retried: retryResult.retried,
        failed: retryResult.failed,
        deadLettered: retryResult.deadLettered,
      },
      backlog,
    });
  } catch (error) {
    logCronError(
      'process-notification-queue',
      error instanceof Error ? error : new Error('Unknown error')
    );

    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 200 });
  }
}
