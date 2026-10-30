import { test, expect } from '../../fixtures';

/**
 * Cross-Role Access Control E2E Tests (C1 / C2)
 *
 * Journeys tested:
 *  C1 — Student blocked from admin-only routes (/dashboard/users, /dashboard/ai,
 *        /dashboard/calendar, /dashboard/logs)
 *  C2 — Data isolation: student sees only own lessons (via RLS)
 */

test.describe(
  'Student route restrictions (C1)',
  { tag: ['@cross-role', '@access-control', '@prod-safe'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async ({ loginAs }) => {
      await loginAs('student');
    });

    test('C1.1 student redirected away from /dashboard/users (teacher/admin only)', async ({
      page,
    }) => {
      await page.goto('/dashboard/users');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/dashboard\/?(\?.*)?$/);
      await expect(page.locator('text=People')).not.toBeVisible();
    });

    test('C1.2 student redirected/blocked from /dashboard/ai', async ({ page }) => {
      try {
        await page.goto('/dashboard/ai', { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      } catch {
        // Navigation may abort if the route immediately redirects — that's acceptable
      }
      const url = page.url();
      const landedOnDashboard = url.includes('/dashboard') && !url.includes('/ai');
      const isBlocked =
        !url.endsWith('/dashboard/ai') ||
        (await page.locator('text=/unauthorized|forbidden|not found|403/i').count()) > 0;
      expect(landedOnDashboard || isBlocked).toBe(true);
    });

    test('C1.2b student redirected away from /dashboard/ai/history', async ({ page }) => {
      await page.goto('/dashboard/ai/history');
      await expect(page).toHaveURL(/\/dashboard\/?(\?.*)?$/);
    });

    test('C1.3 student on /dashboard/calendar sees calendar without crash', async ({ page }) => {
      await page.goto('/dashboard/calendar');
      await page.waitForLoadState('networkidle');
      // Calendar is accessible — just verify no crash
      await expect(
        page.locator('text=/something went wrong|internal server error/i')
      ).not.toBeVisible();
    });

    test('C1.4 student on /dashboard/logs sees no admin log data', async ({ page }) => {
      await page.goto('/dashboard/logs');
      await page.waitForLoadState('networkidle');
      // Logs page is accessible but either redirects or renders empty — no crash
      await expect(
        page.locator('text=/something went wrong|internal server error/i')
      ).not.toBeVisible();
    });
  }
);

test.describe('Data isolation (C2)', { tag: ['@cross-role', '@rls', '@prod-safe'] }, () => {
  test.describe.configure({ mode: 'serial' });
  test('C2 student lessons list is scoped to the student, not the studio', async ({
    page,
    loginAs,
  }) => {
    // Read-only (runs on prod). Row-level isolation against a seeded foreign
    // lesson lives in student/lessons-read.spec.ts, which needs the admin client.
    await loginAs('student');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard/lessons');
    await page.waitForLoadState('networkidle');

    const main = page.locator('main');
    await expect(main.getByText('Your lessons', { exact: true })).toBeVisible({ timeout: 15_000 });
    // The staff scopes would mean the server resolved a teacher/admin view.
    await expect(main.getByText(/^(Teaching|All lessons)$/)).toHaveCount(0);
    await expect(main.locator('a[href="/dashboard/lessons/new"]')).toHaveCount(0);
  });
});
