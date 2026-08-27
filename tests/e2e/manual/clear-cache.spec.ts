import { test, expect } from '../../fixtures';

// Manual, prod-only utility: logs in with TEST_TEACHER_EMAIL/PASSWORD (production
// credentials, see CLAUDE.local.md) and saves the profile settings form purely to
// trigger a layout cache invalidation on strummy.online. It has no assertions of
// its own and times out against the dev stack, where those prod credentials don't
// resolve. Must not run as part of the automated regression suite. Opt in
// explicitly with E2E_RUN_MANUAL=1 and PLAYWRIGHT_BASE_URL pointed at prod.
test('Clear Next.js cache on Prod by saving profile settings', async ({ page }) => {
  test.skip(
    !process.env.E2E_RUN_MANUAL,
    'manual prod cache-bust — opt in with E2E_RUN_MANUAL=1 against a prod PLAYWRIGHT_BASE_URL'
  );

  // Login as test teacher
  await page.goto(process.env.PLAYWRIGHT_BASE_URL + '/sign-in');
  await page.locator('input[type="email"]').fill(process.env.TEST_TEACHER_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.TEST_TEACHER_PASSWORD!);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL(/\/dashboard/);

  // Navigate to settings
  await page.goto(process.env.PLAYWRIGHT_BASE_URL + '/dashboard/settings');
  await page.waitForLoadState('networkidle');

  // Trigger save to invalidate layout cache
  await page.locator('input[name="full_name"]').fill('Test Teacher');
  await page.getByRole('button', { name: 'Save Changes' }).click();

  // Wait a moment for revalidation to complete
  await page.waitForTimeout(3000);

  console.log('Successfully cleared cache!');
});
