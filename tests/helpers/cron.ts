import { expect, type APIRequestContext } from '@playwright/test';

/**
 * Run one of the app's cron jobs on demand, the way Vercel's scheduler would
 * (GET with the CRON_SECRET bearer). Flow specs use it to prove delivery
 * without waiting for the daily dispatcher: enqueue (e.g. `lesson-reminders`),
 * then drain (`process-notification-queue`).
 *
 * CRON_SECRET comes from .env.local, which Playwright loads for the dev stack.
 */
export async function runCron(request: APIRequestContext, job: string): Promise<unknown> {
  const secret = process.env.CRON_SECRET;
  expect(secret, 'CRON_SECRET must be set for the test run').toBeTruthy();
  const res = await request.get(`/api/cron/${job}`, {
    headers: { authorization: `Bearer ${secret}` },
    timeout: 60_000,
  });
  expect(res.status(), `cron ${job} answered ${res.status()}`).toBe(200);
  const body = (await res.json()) as { success?: boolean; error?: string };
  expect(body.success, `cron ${job} reported: ${body.error ?? 'no error'}`).toBe(true);
  return body;
}
