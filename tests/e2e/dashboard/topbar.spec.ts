import { test, expect } from '../../fixtures';

test.describe('DASH-003 topbar', { tag: '@dashboard' }, () => {
  test('admin with a single role sees no role switcher', async ({ page, loginAs }) => {
    // This used to assert the switcher WAS visible, on the premise that the
    // test admin "(p.romanczuk@gmail.com) is also a teacher". The E2E admin is
    // admin@dev.local and holds only is_admin, so Topbar's `roleCount > 1`
    // check correctly hides it. The app was right; the comment was stale.
    await loginAs('admin');
    await expect(page.getByTestId('dashboard-topbar')).toBeVisible();
    await expect(page.getByTestId('topbar-user-menu-trigger')).toBeVisible();
    await expect(page.getByTestId('topbar-role-switcher')).toHaveCount(0);
  });

  // One test per role rather than one test looping over three.
  //
  // As a single test this packed three sign-ins into one budget, so a slow
  // admin sign-in spent the teacher's and the student's time too, and a
  // failure could not say which role broke. Split, each role gets the full
  // budget, retries re-run only the role that failed, and the failing role is
  // named in the report.
  for (const role of ['admin', 'teacher', 'student'] as const) {
    test(`user menu opens and exposes sign-out — ${role}`, async ({ page, loginAs }) => {
      // Kept for the cold-cache case: on the first spec of a run the fixture
      // still performs one real form sign-in, which can outlast the 30s
      // default on a loaded runner.
      test.slow();

      await loginAs(role);
      await page.getByTestId('topbar-user-menu-trigger').click();
      await expect(page.getByTestId('topbar-signout')).toBeVisible();
      await expect(page.getByTestId('topbar-profile-link')).toBeVisible();
    });
  }
});
