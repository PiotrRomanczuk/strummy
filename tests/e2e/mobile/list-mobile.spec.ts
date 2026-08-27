import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';

/**
 * Client-side navigations in this suite take ~2s in isolation and up to ~12s
 * once the whole mobile suite has been hammering the single local Next server
 * — every device project shares it. A fixed 10s budget therefore failed on
 * whichever spec happened to run late, which reads as an app bug and is not:
 * the same tests pass 15/15 when run alone.
 */
const NAV_TIMEOUT = 25_000;

/**
 * Songs list on a phone — the "Strummy — Song List Mobile" design.
 *
 * Below 860px the desktop grid collapses, so two things change shape and both
 * are CSS-gated, which means only a real viewport can prove them:
 *
 *  - the row keeps a trailing mastery/learner block beside the title, instead
 *    of dropping to a bare title + meta line;
 *  - the detail panel becomes a bottom sheet with a dismissing backdrop. On
 *    desktop it is a 340px column beside the list — at 390px wide that would
 *    leave the list unusable, which is the bug this fixes.
 *
 * The URL contract is unchanged: still `?selected=<id>`, still shareable.
 */

const PHONE = { width: 390, height: 844 };

/**
 * EVERY desktop-only cell, not just the first. This assertion used to check
 * `.first()`, which is the header strip — and the header hid correctly while
 * the assignments row's progress and status cells stayed visible behind an
 * inline `display: flex` that outranked the stylesheet. The suite was green
 * while every phone row showed its status pill twice.
 */
const expectEveryDesktopCellHidden = async (page: Page): Promise<void> => {
  const cells = page.locator('.ui-datalist-desktop');
  await expect(cells.first()).toBeAttached({ timeout: 15_000 });
  for (const cell of await cells.all()) {
    await expect(cell).toBeHidden();
  }
};

test.describe('Songs list — mobile', { tag: ['@student', '@songs', '@mobile'] }, () => {
  test.beforeEach(async ({ page, loginAs }) => {
    await page.setViewportSize(PHONE);
    await loginAs('student');
  });

  test('rows keep the mastery block beside the title', async ({ page }) => {
    await page.goto('/dashboard/songs');
    await page.waitForLoadState('networkidle');

    const trail = page.locator('.ui-row-mobile-trail').first();
    await expect(trail).toBeVisible({ timeout: 15_000 });
    // A student sees no mastery (RLS scopes learner summaries to staff), but
    // the learner count is always there — the block must not vanish per-role.
    await expect(trail).toContainText(/learning/i);
  });

  test('the desktop column headers stay hidden', async ({ page }) => {
    await page.goto('/dashboard/songs');
    await page.waitForLoadState('networkidle');

    // Column headings label columns that no longer exist at this width.
    await expectEveryDesktopCellHidden(page);
  });

  test('tapping a row opens the detail as a bottom sheet, not a side column', async ({ page }) => {
    await page.goto('/dashboard/songs');
    await page.waitForLoadState('networkidle');

    const row = page.locator('a[href*="selected="]').first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.click();
    await page.waitForURL(/selected=/, { timeout: NAV_TIMEOUT });

    const panel = page.locator('.ui-list-panel');
    await expect(panel).toBeVisible({ timeout: NAV_TIMEOUT });

    // A sheet spans the viewport and sits at the bottom; the desktop panel is a
    // fixed 340px column. This is the assertion that would have caught the bug.
    const box = await panel.boundingBox();
    expect(box, 'panel should be laid out').not.toBeNull();
    expect(box!.width).toBeGreaterThan(PHONE.width * 0.9);
    expect(box!.y + box!.height).toBeGreaterThan(PHONE.height - 2);
  });

  test('tapping the backdrop dismisses the sheet and keeps the rest of the URL', async ({
    page,
  }) => {
    await page.goto('/dashboard/songs?sort=title');
    await page.waitForLoadState('networkidle');

    await page.locator('a[href*="selected="]').first().click();
    await page.waitForURL(/selected=/, { timeout: NAV_TIMEOUT });

    // The backdrop is a real link, so dismissing works without JS.
    await page.locator('.ui-list-panel-backdrop').click({ position: { x: 10, y: 10 } });
    await page.waitForURL((url) => !url.search.includes('selected='), { timeout: NAV_TIMEOUT });
    await expect(page).toHaveURL(/sort=title/);
  });

  test('the sheet still offers the full page and keeps the shareable URL', async ({ page }) => {
    await page.goto('/dashboard/songs');
    await page.waitForLoadState('networkidle');

    const row = page.locator('a[href*="selected="]').first();
    await row.click();
    await page.waitForURL(/selected=/, { timeout: NAV_TIMEOUT });

    const id = new URL(page.url()).searchParams.get('selected');
    expect(id).toBeTruthy();

    await page.locator('.ui-list-panel').getByRole('link', { name: 'Open full page' }).click();
    await page.waitForURL(`**/dashboard/songs/${id}`, { timeout: NAV_TIMEOUT });
  });
});

/**
 * The same shape on the other two lists. Lessons and assignments adopted the
 * mobile standard from the songs list, so the assertions are deliberately
 * identical — if one list drifts, exactly one of these fails.
 */
for (const list of [
  { name: 'lessons', path: '/dashboard/lessons' },
  { name: 'assignments', path: '/dashboard/assignments' },
] as const) {
  test.describe(`${list.name} list — mobile`, { tag: ['@student', '@mobile'] }, () => {
    test.beforeEach(async ({ page, loginAs }) => {
      await page.setViewportSize(PHONE);
      await loginAs('teacher');
    });

    test('rows keep a trailing block and the headers hide', async ({ page }) => {
      await page.goto(list.path);
      await page.waitForLoadState('networkidle');

      await expect(page.locator('.ui-row-mobile-trail').first()).toBeVisible({ timeout: 15_000 });
      await expectEveryDesktopCellHidden(page);
    });

    test('tapping a row opens a bottom sheet, not a side column', async ({ page }) => {
      await page.goto(list.path);
      await page.waitForLoadState('networkidle');

      const row = page.locator('a[href*="selected="]').first();
      await expect(row).toBeVisible({ timeout: 15_000 });
      await row.click();
      await page.waitForURL(/selected=/, { timeout: NAV_TIMEOUT });

      const panel = page.locator('.ui-list-panel');
      await expect(panel).toBeVisible({ timeout: NAV_TIMEOUT });
      const box = await panel.boundingBox();
      expect(box, 'panel should be laid out').not.toBeNull();
      expect(box!.width).toBeGreaterThan(PHONE.width * 0.9);
      expect(box!.y + box!.height).toBeGreaterThan(PHONE.height - 2);
    });

    test('the backdrop dismisses the sheet', async ({ page }) => {
      await page.goto(list.path);
      await page.waitForLoadState('networkidle');

      const row = page.locator('a[href*="selected="]').first();
      await expect(row).toBeVisible({ timeout: 15_000 });
      await row.click();
      await page.waitForURL(/selected=/, { timeout: NAV_TIMEOUT });

      // Wait for the sheet, not just the URL: the backdrop only dismisses once
      // it has mounted, so clicking into that gap does nothing.
      const backdrop = page.locator('.ui-list-panel-backdrop');
      await expect(page.locator('.ui-list-panel')).toBeVisible({ timeout: NAV_TIMEOUT });
      await expect(backdrop).toBeVisible({ timeout: NAV_TIMEOUT });

      await backdrop.click({ position: { x: 10, y: 10 } });
      await page.waitForURL((url) => !url.search.includes('selected='), { timeout: NAV_TIMEOUT });
    });
  });
}
