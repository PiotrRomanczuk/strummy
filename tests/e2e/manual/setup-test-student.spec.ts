import { test, expect } from '../../fixtures';

// Manual, prod-only utility: logs in with TEST_TEACHER_EMAIL/PASSWORD (production
// credentials, see CLAUDE.local.md), invites TEST_STUDENT_EMAIL as a student, and
// saves profile settings to bust the layout cache. It has no assertions of its own
// and times out against the dev stack, where those prod credentials don't resolve.
// Must not run as part of the automated regression suite. Opt in explicitly with
// E2E_RUN_MANUAL=1 and PLAYWRIGHT_BASE_URL pointed at prod.
test('Link test student to test teacher', async ({ page }) => {
  test.skip(
    !process.env.E2E_RUN_MANUAL,
    'manual prod student-linking utility — opt in with E2E_RUN_MANUAL=1 against a prod PLAYWRIGHT_BASE_URL'
  );

  // Login as test teacher
  await page.goto(process.env.PLAYWRIGHT_BASE_URL + '/sign-in');
  await page.locator('input[type="email"]').fill(process.env.TEST_TEACHER_EMAIL!);
  await page.locator('input[type="password"]').fill(process.env.TEST_TEACHER_PASSWORD!);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL(/\/dashboard/);

  // Navigate to users
  await page.goto(process.env.PLAYWRIGHT_BASE_URL + '/dashboard/users/new');
  await page.waitForLoadState('networkidle');

  // Fill in the new student form
  await page.getByPlaceholder('e.g. Emma Johnson').fill('Test Student');
  await page.getByPlaceholder('student@email.com').fill(process.env.TEST_STUDENT_EMAIL!);

  // Submit
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/dashboard\/users/);

  // Clear Next.js cache on Prod by saving profile settings
  await page.goto(process.env.PLAYWRIGHT_BASE_URL + '/dashboard/settings');
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Save Changes' }).click();

  // Wait a moment for revalidation to complete
  await page.waitForTimeout(3000);

  console.log('Successfully invited test student and cleared cache!');
});
