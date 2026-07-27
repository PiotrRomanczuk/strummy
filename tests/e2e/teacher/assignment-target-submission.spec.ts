import { test, expect } from '../../fixtures';

/**
 * Wave feature: assignment daily practice target + submission type (migration
 * 20260723120100). Proves the create form persists both and the detail Brief
 * card renders them — shipped with no E2E coverage, referenced columns prod
 * was missing.
 */
const ts = Date.now();
const TITLE = `E2E Assignment ${ts}`; // matches global-teardown cleanup pattern

test.describe(
  'Assignment daily target + submission type',
  { tag: ['@teacher', '@assignments'] },
  () => {
    test.beforeEach(async ({ loginAs }) => {
      await loginAs('teacher');
    });

    test('create an assignment with a 10-min target + audio submission → shows on detail', async ({
      page,
    }) => {
      test.setTimeout(120_000);

      await page.goto('/dashboard/assignments/new');
      await expect(page.locator('#assignment-title')).toBeVisible({ timeout: 15_000 });

      await page.locator('#assignment-student').selectOption({ index: 1 });
      await page.locator('#assignment-title').fill(TITLE);
      await page.locator('#assignment-due').fill('2026-05-30');
      await page.locator('#assignment-daily-target').selectOption('10');
      await page.getByRole('radio', { name: 'Audio recording' }).click();

      await page.getByRole('button', { name: 'Create assignment' }).click();
      await page.waitForURL(/\/dashboard\/assignments\/[0-9a-f-]{36}$/, { timeout: 20_000 });
      const url = page.url();

      await expect(page.getByText(TITLE).first()).toBeVisible({ timeout: 10_000 });
      // AssignmentDetailEditorial Brief card: "10 min/day" + "Submit as · Audio recording".
      await expect(page.getByText('10 min/day').first()).toBeVisible();
      await expect(page.getByText('Audio recording').first()).toBeVisible();

      const id = url.split('/').pop();
      const res = await page.request.delete(`/api/assignments/${id}`);
      expect(res.status(), 'assignment delete').toBeLessThan(400);
    });
  }
);
