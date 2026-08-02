import { test, expect } from '../../fixtures';

test.describe('Admin Import Logs', { tag: ['@admin', '@import-logs'] }, () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('admin');
  });

  test('import logs table renders', async ({ page }) => {
    await page.goto('/dashboard/admin/import-logs');
    await page.waitForLoadState('networkidle');

    // Check heading
    await expect(page.getByRole('heading', { name: /import logs/i })).toBeVisible({ timeout: 15_000 });
    
    // Check table
    await expect(page.locator('table')).toBeVisible();
  });
});
