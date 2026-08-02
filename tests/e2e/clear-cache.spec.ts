import { test, expect } from '@playwright/test';

test('Clear Next.js cache on Prod by saving profile settings', async ({ page }) => {
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
