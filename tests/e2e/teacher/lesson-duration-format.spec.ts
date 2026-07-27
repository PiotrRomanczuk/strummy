import { test, expect } from '../../fixtures';

/**
 * Wave feature: lesson duration + in-person/video format (migration
 * 20260723120000). Proves the create form persists both and the detail page
 * renders them — the flow that shipped with no E2E coverage and referenced
 * columns prod was missing.
 */
const ts = Date.now();
const TITLE = `E2E Lesson ${ts}`; // matches global-teardown cleanup pattern

test.describe('Lesson duration + format', { tag: ['@teacher', '@lessons'] }, () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  test('create a 30-min video-call lesson → duration + format show on detail', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('/dashboard/lessons/new');
    await expect(page.locator('#lesson-title')).toBeVisible({ timeout: 15_000 });

    await page.locator('#lesson-student').selectOption({ index: 1 }); // first seeded student
    await page.locator('#lesson-title').fill(TITLE);
    await page.locator('#lesson-when').fill('2026-05-20T14:00');
    await page.locator('#lesson-duration').selectOption('30');
    await page.getByRole('button', { name: 'Video call' }).click();

    await page.getByRole('button', { name: 'Create lesson' }).click();
    await page.waitForURL(/\/dashboard\/lessons\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    const lessonUrl = page.url();

    await expect(page.getByText(TITLE).first()).toBeVisible({ timeout: 10_000 });
    // LessonDetailEditorial.Info renders "30 min" and "Video call" (format.ts).
    await expect(page.getByText('30 min').first()).toBeVisible();
    await expect(page.getByText('Video call').first()).toBeVisible();

    // Cleanup (belt-and-suspenders — teardown also matches the title pattern).
    const id = lessonUrl.split('/').pop();
    const res = await page.request.delete(`/api/lessons/${id}`);
    expect(res.status(), 'lesson delete').toBeLessThan(400);
  });
});
