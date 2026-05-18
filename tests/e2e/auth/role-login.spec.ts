import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsTeacher, loginAsStudent } from '../../helpers/auth';

test.describe('Role login baseline', { tag: '@auth-baseline' }, () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('admin can sign in and land on dashboard', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('teacher can sign in and land on dashboard', async ({ page }) => {
    await loginAsTeacher(page);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('student can sign in and land on dashboard', async ({ page }) => {
    await loginAsStudent(page);
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
