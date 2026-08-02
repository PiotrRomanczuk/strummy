import { test, expect } from '@playwright/test';

test('Link test student to test teacher', async ({ page }) => {
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
