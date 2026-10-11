import { test, expect } from '../../fixtures';

import {
  openAssignmentExtras,
  pickFirstAssignmentStudent,
  sendAssignmentButton,
} from '../../helpers/assignment-form';

/**
 * Teacher Assignments CRUD E2E Tests
 *
 *  - List `/dashboard/assignments` — heading + "New assignment" affordance.
 *  - Create `/dashboard/assignments/new` (Claude Design form: student pills,
 *    title in the "Extras" section, header "Send assignment") → detail page.
 *  - Edit `/dashboard/assignments/[id]/edit` → "Save changes" → detail.
 */

const timestamp = Date.now();
const TEST_ASSIGNMENT_TITLE = `E2E Assignment ${timestamp}`;
const TEST_ASSIGNMENT_EDITED = `E2E Assignment ${timestamp} Edited`;

test.describe('Teacher Assignments CRUD', { tag: ['@teacher', '@assignments'] }, () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  test('assignments list loads with heading and New Assignment button @mobile', { tag: '@prod-safe' }, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/assignments');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /assignments/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.locator('a[href="/dashboard/assignments/new"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('assignment CRUD lifecycle: create → view → edit → delete', async ({ page }) => {
    test.setTimeout(120_000);
    let assignmentId: string | undefined;
    try {
      // ── CREATE ─────────────────────────────────────────────────
      await page.goto('/dashboard/assignments/new');
      expect(await pickFirstAssignmentStudent(page), 'a seeded student').toBe(true);
      await openAssignmentExtras(page);
      await page.locator('#assignment-title').fill(TEST_ASSIGNMENT_TITLE);
      await page.locator('#assignment-notes').fill('E2E Test assignment description');
      await sendAssignmentButton(page).click();

      await page.waitForURL(/\/dashboard\/assignments\/[0-9a-f-]{36}$/, { timeout: 20_000 });
      const assignmentUrl = page.url();
      assignmentId = assignmentUrl.split('/').pop();

      // ── VIEW DETAIL ────────────────────────────────────────────
      await expect(page.getByText(TEST_ASSIGNMENT_TITLE).first()).toBeVisible({
        timeout: 10_000,
      });

      // ── EDIT (prefilled) ───────────────────────────────────────
      await page.goto(`${assignmentUrl}/edit`);
      await openAssignmentExtras(page);
      await expect(page.locator('#assignment-title')).toHaveValue(TEST_ASSIGNMENT_TITLE, {
        timeout: 15_000,
      });
      await page.locator('#assignment-title').fill(TEST_ASSIGNMENT_EDITED);
      await page.getByRole('button', { name: 'Save changes' }).first().click();
      await page.waitForURL(/\/dashboard\/assignments\/[0-9a-f-]{36}$/, { timeout: 20_000 });
      await expect(page.getByText(TEST_ASSIGNMENT_EDITED).first()).toBeVisible({
        timeout: 10_000,
      });
    } finally {
      // ── DELETE (API; also the cleanup when a step above failed) ──
      if (assignmentId) {
        const response = await page.request.delete(`/api/assignments/${assignmentId}`);
        expect(response.status()).toBeLessThan(400);
      }
    }

    await page.goto(`/dashboard/assignments/${assignmentId}`);
    await expect(page.getByText(TEST_ASSIGNMENT_EDITED)).toHaveCount(0, { timeout: 10_000 });
  });
});
