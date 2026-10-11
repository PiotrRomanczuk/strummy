import { test, expect } from '../../fixtures';

/**
 * DASH-003 shell chrome. Since the Claude Design shell (2026-10-10) the top bar
 * holds search, the week chip and the bell; the account menu (settings,
 * language, theme) and sign-out live in the rail footer.
 */
test.describe('DASH-003 topbar', { tag: '@dashboard' }, () => {
  test('admin with a single role sees no role switcher', async ({ page, loginAs }) => {
    // The E2E admin is admin@dev.local and holds only is_admin, so Topbar's
    // `roleCount > 1` check correctly hides the switcher.
    await loginAs('admin');
    await expect(page.getByTestId('dashboard-topbar')).toBeVisible();
    await expect(page.getByTestId('topbar-role-switcher')).toHaveCount(0);
  });

  // One test per role, so a slow sign-in for one role does not spend another's
  // budget and a failure names the role that broke.
  for (const role of ['admin', 'teacher', 'student'] as const) {
    test(`account menu opens and sign-out is reachable — ${role}`, async ({ page, loginAs }) => {
      // Cold-cache case: the first spec of a run still does a real form sign-in.
      test.slow();

      await loginAs(role);
      // A click that lands before hydration opens nothing, so retry the pair.
      await expect(async () => {
        await page.getByTestId('sidebar-user-menu-trigger').click();
        await expect(page.getByTestId('sidebar-settings-link')).toBeVisible({ timeout: 2_000 });
      }).toPass({ timeout: 20_000 });
      await expect(page.getByTestId('sidebar-signout')).toBeVisible();
    });
  }
});
