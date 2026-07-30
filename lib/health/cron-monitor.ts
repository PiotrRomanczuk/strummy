/**
 * Sentry cron monitor check-ins for the dispatcher.
 *
 * Every scheduled job in the system rides one invocation of
 * `/api/cron/dispatcher` (Vercel Hobby allows a single cron definition), and
 * nothing used to detect it simply NOT RUNNING. A job that throws or reports
 * `success: false` does reach Sentry — `logger.error` calls `captureException` —
 * but a cron that never fires produces no error to capture, so that failure mode
 * was pure silence. It covers lesson reminders, notification delivery, calendar
 * sync and the GDPR cleanup.
 *
 * Check-ins close it: Sentry alerts on a MISSED check-in, which also covers
 * "Sentry itself is misconfigured" because from Sentry's side both look
 * identical — nothing arrived. That is the exact class of failure that hid a
 * dead client SDK for weeks (see
 * `__tests__/architecture/sentry-client-instrumentation.test.ts`).
 *
 * `automaticVercelMonitors: true` in next.config.ts does NOT cover this: it does
 * not instrument App Router route handlers, which is every route in this app.
 */

import * as Sentry from '@sentry/nextjs';

export const DISPATCHER_MONITOR_SLUG = 'cron-dispatcher';

/**
 * MUST match `vercel.json` → `crons[0].schedule`. Sentry computes the
 * missed-check-in window from this value, so a mismatch means the monitor either
 * never alerts or alerts every day.
 */
export const DISPATCHER_CRONTAB = '0 6 * * *';

/**
 * Opens an `in_progress` check-in and upserts the monitor definition, returning
 * the id needed to close it.
 *
 * Call this only for an authenticated run. Recording a check-in for an
 * unauthenticated caller would let anyone suppress the missed-check-in alert by
 * hitting the URL.
 */
export function openDispatcherCheckIn(): string {
  return Sentry.captureCheckIn(
    { monitorSlug: DISPATCHER_MONITOR_SLUG, status: 'in_progress' },
    {
      schedule: { type: 'crontab', value: DISPATCHER_CRONTAB },
      checkinMargin: 30, // minutes late before Sentry calls it missed
      maxRuntime: 5, // minutes; the route's own maxDuration is 60s
      timezone: 'Etc/UTC',
    }
  );
}

/** Closes a check-in as `ok` (no failures) or `error` (at least one). */
export function closeDispatcherCheckIn(checkInId: string, failedCount: number): void {
  Sentry.captureCheckIn({
    checkInId,
    monitorSlug: DISPATCHER_MONITOR_SLUG,
    status: failedCount === 0 ? 'ok' : 'error',
  });
}
