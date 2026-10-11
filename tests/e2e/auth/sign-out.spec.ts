import { test, expect } from '../../fixtures';
import { openNav } from '../../helpers/dashboard';

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

      // Below `md` the rail `<aside>` is `hidden` and the same SidebarFooter
      // renders inside the topbar Sheet instead, so clicking the link without
      // opening the nav first passes on Desktop Chrome and times out on every
      // phone project — which is exactly how this spec failed on iPhone SE and
      // iPhone 17 Pro Max in the 2026-10-11 nightly. `openNav` is a no-op at
      // `md` and above, where the rail is already on screen.
      await openNav(page);

      // Both copies of the footer carry the testid: the desktop aside stays in
      // the DOM below `md`, merely hidden by CSS. Resolve on the one actually
      // on screen rather than letting strict mode pick.
      await page.getByTestId('sidebar-signout').filter({ visible: true }).click();
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
