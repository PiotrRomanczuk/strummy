/**
 * Cron Dispatcher — Single entry point for all cron jobs.
 *
 * Vercel Hobby plan allows only 1 cron definition. This dispatcher
 * runs once daily and invokes all cron job handlers internally,
 * checking the current day of week for weekly-only jobs.
 *
 * Individual /api/cron/* routes are preserved so they can still be
 * called directly (e.g. from GitHub Actions for higher-frequency jobs).
 *
 * Schedule: Daily at 6:00 AM UTC
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth/cron-auth';
import { openDispatcherCheckIn, closeDispatcherCheckIn } from '@/lib/health/cron-monitor';

// --- Route handlers (inline-logic routes) ---
import { GET as runDriveVideoScan } from '../drive-video-scan/route';
import { GET as runLessonReminders } from '../lesson-reminders/route';
import { GET as runAssignmentDueReminders } from '../assignment-due-reminders/route';
import { GET as runAssignmentOverdueCheck } from '../assignment-overdue-check/route';
import { GET as runWeeklyDigest } from '../weekly-digest/route';
import { GET as runCleanupAuthEvents } from '../cleanup-auth-events/route';
import { GET as runPruneSystemLogs } from '../prune-system-logs/route';

// --- Service functions (simple wrappers / special runtimes) ---
import { sendAdminSongReport } from '@/app/actions/email/send-admin-report';
import { sendWeeklyInsights } from '@/app/actions/email/send-weekly-insights';
import { updateStudentActivityStatus } from '@/lib/services/student-activity-service';
import { syncAllTeacherCalendars } from '@/lib/services/calendar-sync-service';
import { renewExpiringWebhooks, cleanupExpiredWebhooks } from '@/lib/services/webhook-renewal';
import {
  processQueuedNotifications,
  retryFailedNotifications,
} from '@/lib/services/notification-queue-processor';
import { cleanupExpiredAuthEntries } from '@/lib/auth/rate-limiter';
import {
  checkFailureRate,
  checkBounceRate,
  checkQueueBacklog,
  sendDailyAdminSummary,
} from '@/lib/services/notification-monitoring';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type JobResult = {
  name: string;
  status: 'success' | 'error';
  durationMs: number;
  error?: string;
};

/**
 * Cron routes deliberately return 200-with-an-error-payload rather than 500
 * (no paging on known-degraded states), so a thrown exception is not the only
 * way a job fails — `{ success: false }` in the body is the commoner one, and
 * it used to be counted as a success and reported nowhere.
 */
function reportedFailure(result: unknown): string | null {
  if (typeof result !== 'object' || result === null) return null;
  const body = result as { success?: unknown; error?: unknown; skipped?: unknown };
  if (body.success !== false) return null;
  if (body.skipped === true) return null; // deliberate no-op, not a failure
  return typeof body.error === 'string' ? body.error : 'job reported success: false';
}

async function runJob(name: string, fn: () => Promise<unknown>): Promise<JobResult> {
  const start = Date.now();
  try {
    const result = await fn();
    const failure = reportedFailure(result);
    if (failure) {
      logger.error(`[Dispatcher] Job "${name}" reported failure`, undefined, {
        job: name,
        reason: failure,
      });
      return { name, status: 'error', durationMs: Date.now() - start, error: failure };
    }
    return { name, status: 'success', durationMs: Date.now() - start };
  } catch (error) {
    logger.error(`[Dispatcher] Job "${name}" failed`, error, { job: name });
    return {
      name,
      status: 'error',
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

type Job = { name: string; fn: () => Promise<unknown> };

/**
 * Jobs that run on every dispatcher invocation. `authRequest` carries the
 * caller's CRON_SECRET through to sub-routes that verify it themselves.
 */
function buildDailyJobs(authRequest: NextRequest): Job[] {
  return [
    // Daily jobs — always run
    {
      name: 'daily-report',
      fn: () => sendAdminSongReport(),
    },
    {
      name: 'lesson-reminders',
      fn: () => runLessonReminders(authRequest).then((r) => r.json()),
    },
    {
      name: 'assignment-due-reminders',
      fn: () => runAssignmentDueReminders(authRequest).then((r) => r.json()),
    },
    {
      name: 'assignment-overdue-check',
      fn: () => runAssignmentOverdueCheck(authRequest).then((r) => r.json()),
    },
    {
      name: 'drive-video-scan',
      fn: () => runDriveVideoScan(authRequest).then((r) => r.json()),
    },
    {
      name: 'sync-calendars-and-update-status',
      fn: async () => {
        const sync = await syncAllTeacherCalendars();
        const status = await updateStudentActivityStatus();
        return { sync, status };
      },
    },
    {
      name: 'renew-webhooks',
      fn: async () => {
        const renewal = await renewExpiringWebhooks();
        const cleanup = await cleanupExpiredWebhooks();
        return { renewal, cleanup };
      },
    },
    {
      name: 'process-notification-queue',
      fn: async () => {
        const queue = await processQueuedNotifications(100);
        const retry = await retryFailedNotifications();
        await cleanupExpiredAuthEntries();
        return { queue, retry };
      },
    },
    {
      // GDPR: auth_events holds emails + IPs. This was a direct vercel.json
      // cron until 3d2f1c25 collapsed the schedule into this dispatcher and
      // it was the one job that didn't get carried over — it ran nowhere
      // between then and now. Not the same as cleanupExpiredAuthEntries()
      // below, which prunes in-memory rate-limiter rows.
      name: 'cleanup-auth-events',
      fn: () => runCleanupAuthEvents(authRequest).then((r) => r.json()),
    },
    {
      // Retention for the persisted warn/error stream — previously unbounded.
      name: 'prune-system-logs',
      fn: () => runPruneSystemLogs(authRequest).then((r) => r.json()),
    },
    {
      name: 'admin-monitoring',
      fn: async () => {
        await checkFailureRate();
        await checkBounceRate();
        await checkQueueBacklog();
        // Daily summary runs at 8 AM UTC in the original schedule;
        // since the dispatcher runs at 6 AM, send it here too.
        await sendDailyAdminSummary();
      },
    },
  ];
}

/** Jobs gated on the day of week (0 = Sunday, 1 = Monday). */
function buildWeeklyJobs(authRequest: NextRequest, dayOfWeek: number): Job[] {
  if (dayOfWeek === 0) {
    return [
      {
        name: 'weekly-digest',
        fn: () => runWeeklyDigest(authRequest).then((r) => r.json()),
      },
    ];
  }
  if (dayOfWeek === 1) {
    return [
      {
        name: 'weekly-insights',
        fn: () => sendWeeklyInsights().then((r) => r),
      },
    ];
  }
  return [];
}

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  // Deliberately no check-in on an auth failure: that is not a legitimate run,
  // and staying silent lets Sentry's missed-check-in alert fire instead of
  // recording a bogus success.
  if (authError) return authError;

  const checkInId = openDispatcherCheckIn();

  const startTime = Date.now();
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday

  try {
    // Build an authenticated NextRequest for route handlers that verify CRON_SECRET
    const authRequest = new NextRequest('http://localhost/api/cron/dispatcher', {
      headers: { authorization: request.headers.get('authorization') || '' },
    });

    const jobs = [...buildDailyJobs(authRequest), ...buildWeeklyJobs(authRequest, dayOfWeek)];

    // --- Run all jobs in parallel ---
    const settled = await Promise.allSettled(jobs.map((j) => runJob(j.name, j.fn)));

    const results: JobResult[] = settled.map((s) =>
      s.status === 'fulfilled'
        ? s.value
        : { name: 'unknown', status: 'error' as const, durationMs: 0, error: String(s.reason) }
    );

    const succeeded = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'error').length;

    closeDispatcherCheckIn(checkInId, failed);

    // Non-2xx when any job failed. Individual /api/cron/* routes still return
    // 200-with-error-payload (no paging on known-degraded states), but the
    // dispatcher is the fleet's single status signal — if it always answers
    // 200, no external prober can ever tell a healthy run from a broken one.
    // Deliberate no-ops are already excluded upstream via `skipped`.
    return NextResponse.json(
      {
        success: failed === 0,
        summary: { total: results.length, succeeded, failed },
        totalDurationMs: Date.now() - startTime,
        jobs: results,
        dayOfWeek,
        timestamp: now.toISOString(),
      },
      { status: failed === 0 ? 200 : 500 }
    );
  } catch (error) {
    // Fan-out itself blew up (not a single job) — close the check-in as failed
    // so the monitor reports error rather than hanging until Sentry times it out.
    closeDispatcherCheckIn(checkInId, 1);
    logger.error('[Dispatcher] Fan-out failed before results were aggregated', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        dayOfWeek,
        timestamp: now.toISOString(),
      },
      { status: 500 }
    );
  }
}
