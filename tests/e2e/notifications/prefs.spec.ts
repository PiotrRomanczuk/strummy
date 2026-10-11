import { test, expect } from '../../fixtures';
import { adminClient, getAdminId, getStudentId } from '../../helpers/seed-ids';

import type { Locator as Toggle } from '@playwright/test';

/**
 * Flip a preference and wait until it sticks. A click that lands before
 * hydration is dropped (the native checkbox flips, React never hears it), which
 * made both tests below fail on alternate runs — so retry until the state holds.
 */
async function setPref(toggle: Toggle, checked: boolean): Promise<void> {
  await expect(async () => {
    if ((await toggle.isChecked()) !== checked) await toggle.click();
    await expect(toggle).toBeChecked({ checked, timeout: 3_000 });
  }).toPass({ timeout: 20_000 });
}

/** The persisted value, read back with the service role. */
const enabledInDb = (profileId: string, type: string) => async () =>
  (
    await adminClient()
      .from('notification_preferences')
      .select('enabled')
      .eq('profile_id', profileId)
      .eq('notification_type', type)
      .single()
  ).data?.enabled;

/**
 * Notification Preferences E2E Tests (A10.2 / B8.2)
 *
 * Journeys tested:
 *  A10.2/B8.2 — Toggle per-type notification preference off → on
 *
 * Per-type toggles only render when rows exist in notification_preferences.
 * We seed them in beforeAll and clean up in afterAll.
 */

let ADMIN_ID: string;
let STUDENT_ID: string;

const seededIds: string[] = [];

test.describe.configure({ mode: 'serial' });

test.describe(
  'Notification Preferences',
  { tag: ['@admin', '@notifications', '@settings'] },
  () => {
    // What existed before seeding, so afterAll can put it back exactly.
    let originals: { profile_id: string; notification_type: string; enabled: boolean }[] = [];

    test.beforeAll(async () => {
      const db = adminClient();
      [ADMIN_ID, STUDENT_ID] = await Promise.all([getAdminId(db), getStudentId(db)]);

      const { data: before } = await db
        .from('notification_preferences')
        .select('profile_id, notification_type, enabled')
        .or(
          `and(profile_id.eq.${ADMIN_ID},notification_type.eq.lesson_reminder_24h),` +
            `and(profile_id.eq.${STUDENT_ID},notification_type.eq.assignment_created)`
        );
      originals = before ?? [];

      // Ensure admin has lesson_reminder_24h pref (upsert to avoid duplicate)
      const { data: adminData } = await db
        .from('notification_preferences')
        .upsert(
          [{ profile_id: ADMIN_ID, notification_type: 'lesson_reminder_24h', enabled: true }],
          {
            onConflict: 'profile_id,notification_type',
            ignoreDuplicates: false,
          }
        )
        .select('id');
      if (adminData) seededIds.push(...adminData.map((r) => r.id));

      // Ensure student has assignment_created pref
      const { data: studentData } = await db
        .from('notification_preferences')
        .upsert(
          [{ profile_id: STUDENT_ID, notification_type: 'assignment_created', enabled: true }],
          {
            onConflict: 'profile_id,notification_type',
            ignoreDuplicates: false,
          }
        )
        .select('id');
      if (studentData) seededIds.push(...studentData.map((r) => r.id));
    });

    test.afterAll(async () => {
      const db = adminClient();
      // Restore what was there; delete only the rows this spec created. (The
      // old cleanup deleted the student's pref even when it pre-existed.)
      const seeded = [
        { profile_id: ADMIN_ID, notification_type: 'lesson_reminder_24h' },
        { profile_id: STUDENT_ID, notification_type: 'assignment_created' },
      ];
      for (const row of seeded) {
        const original = originals.find(
          (o) => o.profile_id === row.profile_id && o.notification_type === row.notification_type
        );
        const table = db.from('notification_preferences');
        const query = original ? table.update({ enabled: original.enabled }) : table.delete();
        await query.eq('profile_id', row.profile_id).eq('notification_type', row.notification_type);
      }
    });

    test('A10.2 toggle a notification preference off then back on', async ({ page, loginAs }) => {
      await loginAs('admin');
      // Navigate from settings page via the link so that the client-side auth
      // context from the dashboard is preserved (SPA nav keeps AuthProvider alive)
      await page.goto('/dashboard/settings');
      await page.waitForLoadState('networkidle');
      await page.click('a[href="/dashboard/settings/notifications"]');
      await page.waitForURL('**/settings/notifications');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: /notification/i }).first()).toBeVisible({
        timeout: 15_000,
      });

      // Toggle the "lesson_reminder_24h" preference
      const prefToggle = page.locator('#pref-lesson_reminder_24h');
      await expect(prefToggle).toBeVisible({ timeout: 20_000 });

      // Seeded enabled in beforeAll; off, persisted, then back on.
      await expect(prefToggle).toBeChecked();
      await setPref(prefToggle, false);
      await expect
        .poll(enabledInDb(ADMIN_ID, 'lesson_reminder_24h'), { timeout: 10_000 })
        .toBe(false);
      await setPref(prefToggle, true);
      await expect
        .poll(enabledInDb(ADMIN_ID, 'lesson_reminder_24h'), { timeout: 10_000 })
        .toBe(true);
    });

    test('B8.2 student can toggle own notification preferences', async ({ page, loginAs }) => {
      await loginAs('student');
      // Navigate from settings page via link to preserve client-side auth context
      await page.goto('/dashboard/settings');
      await page.waitForLoadState('networkidle');
      await page.click('a[href="/dashboard/settings/notifications"]');
      await page.waitForURL('**/settings/notifications');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: /notification/i }).first()).toBeVisible({
        timeout: 15_000,
      });

      // Toggle the "assignment_created" preference
      const prefToggle = page.locator('#pref-assignment_created');
      await expect(prefToggle).toBeVisible({ timeout: 20_000 });

      await expect(prefToggle).toBeChecked();
      await setPref(prefToggle, false);
      await expect
        .poll(enabledInDb(STUDENT_ID, 'assignment_created'), { timeout: 10_000 })
        .toBe(false);
      await setPref(prefToggle, true);
      await expect
        .poll(enabledInDb(STUDENT_ID, 'assignment_created'), { timeout: 10_000 })
        .toBe(true);
    });
  }
);
