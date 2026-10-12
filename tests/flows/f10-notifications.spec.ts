import { test, expect } from '../fixtures';
import { runCron } from '../helpers/cron';
import { isMailpitSmtpConfigured, MAILPIT_SMTP_REQUIRED, waitForEmail } from '../helpers/mailpit';
import { adminClient, getStudentId, studentEmail } from '../helpers/seed-ids';

import type { Locator } from '@playwright/test';

/** Per-type toggles render only for rows that exist, so F10.3 seeds this one. */
const PREF_TYPE = 'lesson_rescheduled';
/** Per-run, so a row left behind by a killed run on the shared dev stack can never match. */
const REMINDER_TITLE = `E2E Flow reminder ${Date.now().toString(36)}`;

/**
 * Flip a preference and wait until it sticks. A click that lands before
 * hydration is dropped (the native checkbox flips, React never hears it).
 */
async function setPref(toggle: Locator, checked: boolean): Promise<void> {
  await expect(async () => {
    if ((await toggle.isChecked()) !== checked) await toggle.click();
    await expect(toggle).toBeChecked({ checked, timeout: 3_000 });
  }).toPass({ timeout: 20_000 });
}

/**
 * F10 — Notifications: inbox, badge, preferences, email.
 */
test.describe('F10 notifications', { tag: ['@flow'] }, () => {
  test.describe.configure({ mode: 'serial' });
  let studentId = '';
  let notificationId: string | undefined;
  // The preference row F10.3 toggles: created here (and deleted by id) unless
  // the student already had one, in which case its value is put back.
  let seededPrefId: string | undefined;
  let originalPrefEnabled: boolean | undefined;

  test.beforeAll(async () => {
    const db = adminClient();
    studentId = await getStudentId(db);
    const { data: existingPref } = await db
      .from('notification_preferences')
      .select('id, enabled')
      .eq('profile_id', studentId)
      .eq('notification_type', PREF_TYPE)
      .maybeSingle();
    if (existingPref) {
      originalPrefEnabled = existingPref.enabled as boolean;
      await db.from('notification_preferences').update({ enabled: true }).eq('id', existingPref.id);
    } else {
      const { data: inserted } = await db
        .from('notification_preferences')
        .insert({ profile_id: studentId, notification_type: PREF_TYPE, enabled: true })
        .select('id')
        .single();
      seededPrefId = inserted?.id;
    }
    // Column names are `notification_type` / `body` — the earlier `type` /
    // `message` guess failed at PostgREST and silently skipped F10.1–2.
    const { data, error } = await db
      .from('in_app_notifications')
      .insert({
        profile_id: studentId,
        notification_type: 'lesson_reminder_24h',
        title: REMINDER_TITLE,
        body: 'Your lesson is tomorrow',
        is_read: false,
      })
      .select('id')
      .single();
    expect(error, `notification seed failed: ${error?.message}`).toBeNull();
    notificationId = data?.id;
  });
  test.afterAll(async () => {
    const db = adminClient();
    if (notificationId) await db.from('in_app_notifications').delete().eq('id', notificationId);
    if (seededPrefId) await db.from('notification_preferences').delete().eq('id', seededPrefId);
    else if (originalPrefEnabled !== undefined)
      await db
        .from('notification_preferences')
        .update({ enabled: originalPrefEnabled })
        .eq('profile_id', studentId)
        .eq('notification_type', PREF_TYPE);
  });

  test('F10.1 the bell shows the unread count', async ({ page, loginAs }) => {
    test.skip(!notificationId, 'seed failed');
    await loginAs('student');
    await page.goto('/dashboard');
    await expect(page.getByTestId('topbar-bell-badge')).toBeVisible({ timeout: 15_000 });
  });

  test('F10.2 the inbox lists it and mark-as-read persists', async ({ page, loginAs }) => {
    test.skip(!notificationId, 'seed failed');
    await loginAs('student');
    await page.goto('/dashboard/notifications');
    const title = page.getByText(REMINDER_TITLE, { exact: true });
    await expect(title).toBeVisible({ timeout: 15_000 });
    // The innermost container holding both the title and a "Mark read" button
    // is this notification's row; a reminder has no action URL, so the title
    // itself is not a link and only that button marks it read.
    const row = page
      .locator('div')
      .filter({ has: title })
      .filter({ has: page.getByRole('button', { name: 'Mark read' }) })
      .last();
    await row.getByRole('button', { name: 'Mark read' }).click();
    await expect
      .poll(
        async () =>
          (
            await adminClient()
              .from('in_app_notifications')
              .select('is_read')
              .eq('id', notificationId!)
              .single()
          ).data?.is_read,
        { timeout: 10_000 }
      )
      .toBe(true);
  });

  test('F10.3 a preference toggle persists', async ({ page, loginAs }) => {
    test.setTimeout(60_000);
    const enabledInDb = async () =>
      (
        await adminClient()
          .from('notification_preferences')
          .select('enabled')
          .eq('profile_id', studentId)
          .eq('notification_type', PREF_TYPE)
          .single()
      ).data?.enabled;

    await loginAs('student');
    // Reach the page by link from settings so the client-side auth context the
    // toggles need is already alive (a cold direct load used to drop the click).
    await page.goto('/dashboard/settings');
    await page.click('a[href="/dashboard/settings/notifications"]');
    await page.waitForURL('**/settings/notifications');

    const toggle = page.locator(`#pref-${PREF_TYPE}`);
    await expect(toggle).toBeVisible({ timeout: 20_000 });
    await expect(toggle).toBeChecked();

    await setPref(toggle, false);
    await expect.poll(enabledInDb, { timeout: 10_000 }).toBe(false);

    // Persisted, not just toggled in memory: come back to the page (by link —
    // a cold direct load stays on "Loading notification preferences…") and it
    // is off; on again sticks too.
    await page.goto('/dashboard/settings');
    await page.click('a[href="/dashboard/settings/notifications"]');
    await page.waitForURL('**/settings/notifications');
    await expect(page.locator(`#pref-${PREF_TYPE}`)).not.toBeChecked({ timeout: 20_000 });
    await setPref(page.locator(`#pref-${PREF_TYPE}`), true);
    await expect.poll(enabledInDb, { timeout: 10_000 }).toBe(true);
  });

  test('F10.4 a student email is actually delivered', async ({ request }) => {
    test.skip(!isMailpitSmtpConfigured(), MAILPIT_SMTP_REQUIRED);
    test.setTimeout(90_000);
    // A queued reminder for the student, drained the way the dispatcher does
    // it; with STUDENT_EMAILS_ENABLED and SMTP pointed at the dev Mailpit the
    // mail has to land there. The entity id is synthetic so cleanup is exact.
    const db = adminClient();
    const entityId = crypto.randomUUID();
    const { data: queued, error } = await db
      .from('notification_queue')
      .insert({
        notification_type: 'lesson_reminder_24h',
        recipient_profile_id: studentId,
        template_data: {
          studentName: 'Flow Student',
          teacherName: 'Flow Teacher',
          lessonDate: 'tomorrow',
          lessonTime: '10:00 AM',
          lessonTitle: `E2E Flow F10.4 ${Date.now()}`,
        },
        entity_type: 'lesson',
        entity_id: entityId,
        priority: 7,
        status: 'pending',
        scheduled_for: new Date().toISOString(),
      })
      .select('id')
      .single();
    expect(error, `queue seed failed: ${error?.message}`).toBeNull();

    try {
      const since = Date.now();
      await runCron(request, 'process-notification-queue');
      const mail = await waitForEmail(studentEmail(), 30_000, since - 2_000, /Lesson Reminder/);
      expect(mail.Subject).toContain('Upcoming Lesson Reminder');

      const { data: row } = await db
        .from('notification_queue')
        .select('status')
        .eq('id', queued!.id)
        .single();
      expect(row?.status).toBe('sent');
    } finally {
      await db.from('notification_log').delete().eq('entity_id', entityId);
      await db.from('in_app_notifications').delete().eq('entity_id', entityId);
      await db.from('notification_queue').delete().eq('id', queued!.id);
    }
  });
});
