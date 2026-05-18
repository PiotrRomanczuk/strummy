import { test, expect } from '@playwright/test';
import { loginAs } from '../../helpers/dashboard';

test.describe('DASH-005 today lessons card', { tag: '@dashboard' }, () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies();
  });

  test('admin (multi-role with teacher) sees today lessons card', async ({ page }) => {
    await loginAs(page, 'admin');
    // Admin is also a teacher in the seed → default activeView resolves to teacher → card visible.
    await expect(page.getByTestId('today-lessons-card')).toBeVisible();
  });

  test('teacher sees today lessons card with empty-or-populated state', async ({ page }) => {
    await loginAs(page, 'teacher');
    const card = page.getByTestId('today-lessons-card');
    await expect(card).toBeVisible();
    // Either the list renders OR the empty state "No lessons today" is shown.
    const hasList = (await page.getByTestId('today-lessons-list').count()) > 0;
    const hasEmpty = (await card.getByText(/No lessons today/i).count()) > 0;
    expect(hasList || hasEmpty).toBeTruthy();
  });

  test('student does not see today lessons card', async ({ page }) => {
    await loginAs(page, 'student');
    await expect(page.getByTestId('today-lessons-card')).toHaveCount(0);
  });
});
