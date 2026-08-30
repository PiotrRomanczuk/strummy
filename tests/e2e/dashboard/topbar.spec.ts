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

  // One test per role rather than one test looping over three.
  //
  // As a single test this packed three full form sign-ins into one budget, so
  // a slow admin sign-in spent the teacher's and the student's time too, and a
  // failure could not say which role broke. `test.slow()` (2026-08-29) raised
  // the shared budget to 90s but left the three sharing it; on 2026-08-30 the
  // test still failed on Desktop Chrome, this time on `login()`'s own 30s
  // navigation cap rather than the test's.
  //
  // Split, each role gets the full budget for its one sign-in, retries re-run
  // only the role that failed, and the failing role is named in the report.
  // `beforeEach` already clears cookies, so each test starts signed out.
  for (const role of ['admin', 'teacher', 'student'] as const) {
    test(`user menu opens and exposes sign-out — ${role}`, async ({ page }) => {
      // A real form sign-in against a loaded runner can outlast the 30s
      // default on its own; `login()`'s waits are sized for that.
      test.slow();

      await loginAs(page, role);
      await page.getByTestId('topbar-user-menu-trigger').click();
      await expect(page.getByTestId('topbar-signout')).toBeVisible();
      await expect(page.getByTestId('topbar-profile-link')).toBeVisible();
    });
  }
});
