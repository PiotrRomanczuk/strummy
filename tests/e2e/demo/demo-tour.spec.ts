import { test, expect } from '../../fixtures';

/**
 * Demo guided tour (driver.js) — demo accounts get a first-run walkthrough.
 * Gated on the profile's is_development flag, so it must appear for the demo
 * teacher and must NOT appear for the regular dev teacher account.
 */
test.describe('Demo guided tour', { tag: ['@demo'] }, () => {
  test('auto-starts for the demo teacher, dismisses, and replays on demand', async ({
    page,
    loginAs,
  }) => {
    await loginAs('demo');
    await page.goto('/dashboard');

    const popover = page.locator('.driver-popover');
    await expect(popover).toBeVisible({ timeout: 15_000 });
    await expect(popover).toContainText(/Welcome to Strummy/i);

    // Dismissing marks it seen — a reload must not re-trigger it.
    await page.keyboard.press('Escape');
    await expect(popover).not.toBeVisible();

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(popover).not.toBeVisible();

    // But the floating help button replays it.
    await page.getByTestId('demo-tour-replay').click();
    await expect(popover).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('Escape');
  });

  test('never renders for a non-demo account', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('demo-tour-replay')).toHaveCount(0);
    await expect(page.locator('.driver-popover')).toHaveCount(0);
  });
});
