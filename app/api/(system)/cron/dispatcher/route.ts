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

// --- Route handlers (inline-logic routes) ---
import { GET as runDriveVideoScan } from '../drive-video-scan/route';
import { GET as runLessonReminders } from '../lesson-reminders/route';
import { GET as runAssignmentDueReminders } from '../assignment-due-reminders/route';
import { GET as runAssignmentOverdueCheck } from '../assignment-overdue-check/route';
import { GET as runWeeklyDigest } from '../weekly-digest/route';

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

async function runJob(name: string, fn: () => Promise<unknown>): Promise<JobResult> {
  const start = Date.now();
  try {
    await fn();
    return { name, status: 'success', durationMs: Date.now() - start };
  } catch (error) {
    logger.error(`[Dispatcher] Job "${name}" failed:`, error);
    return {
      name,
      status: 'error',
      durationMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const startTime = Date.now();
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday

  // Build an authenticated NextRequest for route handlers that verify CRON_SECRET
  const authRequest = new NextRequest('http://localhost/api/cron/dispatcher', {
    headers: { authorization: request.headers.get('authorization') || '' },
  });

  // --- Assemble the job list ---
  const jobs: Array<{ name: string; fn: () => Promise<unknown> }> = [
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

  // Weekly jobs — conditional on day of week
  if (dayOfWeek === 0) {
    jobs.push({
      name: 'weekly-digest',
      fn: () => runWeeklyDigest(authRequest).then((r) => r.json()),
    });
  }
  if (dayOfWeek === 1) {
    jobs.push({
      name: 'weekly-insights',
      fn: () => sendWeeklyInsights().then((r) => r),
    });
  }

  // --- Run all jobs in parallel ---
  const settled = await Promise.allSettled(jobs.map((j) => runJob(j.name, j.fn)));

  const results: JobResult[] = settled.map((s) =>
    s.status === 'fulfilled'
      ? s.value
      : { name: 'unknown', status: 'error' as const, durationMs: 0, error: String(s.reason) }
  );

  const succeeded = results.filter((r) => r.status === 'success').length;
  const failed = results.filter((r) => r.status === 'error').length;

  return NextResponse.json({
    success: failed === 0,
    summary: { total: results.length, succeeded, failed },
    totalDurationMs: Date.now() - startTime,
    jobs: results,
    dayOfWeek,
    timestamp: now.toISOString(),
  });
}
