import { test, expect } from '../../fixtures';
import { loginAs } from '../../helpers/dashboard';

test.describe('DASH-003 topbar', { tag: '@dashboard' }, () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('admin with a single role sees no role switcher', async ({ page }) => {
    // This used to assert the switcher WAS visible, on the premise that the
    // test admin "(p.romanczuk@gmail.com) is also a teacher". The E2E admin is
    // admin@dev.local and holds only is_admin, so Topbar's `roleCount > 1`
    // check correctly hides it. The app was right; the comment was stale.
    await loginAs(page, 'admin');
    await expect(page.getByTestId('dashboard-topbar')).toBeVisible();
    await expect(page.getByTestId('topbar-user-menu-trigger')).toBeVisible();
    await expect(page.getByTestId('topbar-role-switcher')).toHaveCount(0);
  });

  test('user menu opens and exposes sign-out for each role', async ({ page }) => {
    for (const role of ['admin', 'teacher', 'student'] as const) {
      await page.context().clearCookies();
      await loginAs(page, role);
      await page.getByTestId('topbar-user-menu-trigger').click();
      await expect(page.getByTestId('topbar-signout')).toBeVisible();
      await expect(page.getByTestId('topbar-profile-link')).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });
});
