import { test, expect } from '../../fixtures';
import type { Page } from '@playwright/test';
import { pickLessonStudent, setLessonWhen } from '../../helpers/lesson-form';
import { adminClient } from '../../helpers/seed-ids';

/**
 * Teacher Lessons CRUD E2E Tests
 *
 * Targets the UI:
 *  - List `/dashboard/lessons` — heading + lesson links + "New lesson" affordance.
 *  - Create/Edit `LessonForm` — single-page form with student pills,
 *    `#lesson-title`, `#lesson-date` + `#lesson-time`. Submit
 *    "Schedule lesson" / "Save changes"; on success router.push → the lesson's
 *    detail page (`/dashboard/lessons/[id]`).
 */

const timestamp = Date.now();
const TEST_LESSON_TITLE = `E2E Lesson ${timestamp}`;
const TEST_LESSON_EDITED = `E2E Lesson ${timestamp} Edited`;

async function fillLessonForm(page: Page, title: string) {
  await expect(page.locator('#lesson-title')).toBeVisible({ timeout: 15_000 });
  // Required: a student. Pick the first real option in the select.
  await pickLessonStudent(page);
  await page.locator('#lesson-title').fill(title);
  await setLessonWhen(page, '2026-04-15T10:00');
}

test.describe('Teacher Lessons CRUD', { tag: ['@teacher', '@lessons'] }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  // Safety net: the lifecycle deletes through the UI, but a failure before
  // that step must not leak the lesson.
  let createdId: string | undefined;
  test.afterEach(async () => {
    if (createdId) await adminClient().from('lessons').delete().eq('id', createdId);
    createdId = undefined;
  });

  test('lessons list loads with heading and New Lesson button @mobile', { tag: '@prod-safe' }, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/lessons');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /lessons/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Desktop and phone layouts both render a New lesson link; only one is shown.
    const newLesson = page.locator('a[href="/dashboard/lessons/new"]').filter({ visible: true });
    await expect(newLesson.first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('lesson CRUD lifecycle: create → view → edit → delete', async ({ page }) => {
    test.setTimeout(120_000);

    // ── CREATE ───────────────────────────────────────────────────
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/lessons/new');
    await page.waitForLoadState('networkidle');

    await fillLessonForm(page, TEST_LESSON_TITLE);
    await page.getByRole('button', { name: 'Schedule lesson' }).click();

    await page.waitForURL(/\/dashboard\/lessons\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    const lessonUrl = page.url();
    createdId = lessonUrl.split('/').pop();

    // ── VIEW DETAIL ──────────────────────────────────────────────
    await expect(page.getByText(TEST_LESSON_TITLE).first()).toBeVisible({ timeout: 10_000 });

    // ── EDIT ─────────────────────────────────────────────────────
    await page.goto(lessonUrl + '/edit', { timeout: 45_000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#lesson-title')).toBeVisible({ timeout: 10_000 });
    await page.locator('#lesson-title').fill(TEST_LESSON_EDITED);
    // A click before hydration is dropped; saving an edit twice is harmless,
    // so retry until the redirect to the detail page happens.
    await expect(async () => {
      await page.getByRole('button', { name: 'Save changes' }).click();
      await page.waitForURL(/\/dashboard\/lessons\/[0-9a-f-]{36}$/, { timeout: 8_000 });
    }).toPass({ timeout: 40_000 });
    await expect(page).not.toHaveURL(/\/edit/);
    await expect(page.getByText(TEST_LESSON_EDITED).first()).toBeVisible({ timeout: 10_000 });

    // ── DELETE (trash icon → confirm dialog) ─────────────────────
    // Desktop composition: the phone detail (per its mockup) offers edit only.
    await page.setViewportSize({ width: 1440, height: 900 });
    const trash = page.getByRole('button', { name: 'Delete lesson' }).filter({ visible: true });
    const dialog = page.getByRole('alertdialog');

    // Cancel keeps the lesson.
    await trash.first().click();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(lessonUrl);

    // Confirm removes it and returns to the list.
    await trash.first().click();
    await dialog.getByRole('button', { name: 'Delete lesson' }).click();
    // Generous: in dev the redirect target may be compiling for the first time.
    await page.waitForURL(/\/dashboard\/lessons$/, { timeout: 45_000 });

    // Detail page should no longer resolve to the lesson.
    await page.goto(lessonUrl);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(TEST_LESSON_EDITED)).toHaveCount(0, { timeout: 10_000 });
  });
});
