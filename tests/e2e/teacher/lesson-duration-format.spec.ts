import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';
import { pickLessonStudent, setLessonWhen } from '../../helpers/lesson-form';

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

  // Deleted in afterEach (service role) so a failure mid-test cannot leak the
  // row; the in-test API delete only ran when every step before it passed.
  let createdId: string | undefined;
  test.afterEach(async () => {
    if (createdId) await adminClient().from('lessons').delete().eq('id', createdId);
    createdId = undefined;
  });

  test('create a 30-min video-call lesson → duration + format show on detail', async ({ page }) => {
    test.setTimeout(120_000);
    // Persistence check: the desktop detail shows duration AND format; the
    // phone composition shows the time line only.
    await page.setViewportSize({ width: 1440, height: 900 });

    await page.goto('/dashboard/lessons/new');
    await expect(page.locator('#lesson-title')).toBeVisible({ timeout: 15_000 });

    await pickLessonStudent(page);
    await page.locator('#lesson-title').fill(TITLE);
    await setLessonWhen(page, '2026-05-20T14:00');
    await page.locator('#lesson-duration').selectOption('30');
    await page.getByRole('button', { name: 'Video call' }).click();

    await page.getByRole('button', { name: 'Schedule lesson' }).click();
    await page.waitForURL(/\/dashboard\/lessons\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    const lessonUrl = page.url();
    createdId = lessonUrl.split('/').pop();

    // The desktop and phone layouts both render the title; only one is shown.
    await expect(page.getByText(TITLE).filter({ visible: true }).first()).toBeVisible({
      timeout: 10_000,
    });
    // LessonDetailEditorial.Info renders "30 min" and "Video call" (format.ts).
    await expect(page.getByText('30 min').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText('Video call').filter({ visible: true }).first()).toBeVisible();
  });
});
