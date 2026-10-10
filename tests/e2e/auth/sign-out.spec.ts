import { test, expect } from '../../fixtures';

/**
 * Sign-out E2E Tests (A1.2)
 *
 * Journeys tested:
 *  A1.2 — Sign out from the rail footer → redirected to /sign-in, session cleared
 *
 * Since the Claude Design shell (2026-10-10) sign-out is a plain link to
 * /auth/signout in the rail footer, not an item in a top-bar menu.
 */

test.describe('Sign-out', { tag: ['@auth', '@sign-out'] }, () => {
  for (const role of ['admin', 'student'] as const) {
    test(`A1.2 ${role} signs out from the rail and lands on sign-in`, async ({ page, loginAs }) => {
      await loginAs(role);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await page.getByTestId('sidebar-signout').click();
      await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });

      // Landing on /sign-in is NOT proof of sign-out — the session lives in an
      // `sb-*` cookie, and a redirect can win the race against middleware while
      // the cookie survives. That exact false-green once hid a real bug, so
      // assert the session is genuinely dead.
      await page.goto('/dashboard');
      await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });
      const authCookies = (await page.context().cookies()).filter((c) => c.name.startsWith('sb-'));
      expect(authCookies).toEqual([]);
    });
  }
});
