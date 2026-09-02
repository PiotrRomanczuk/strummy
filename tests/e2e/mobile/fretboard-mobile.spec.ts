import { test, expect } from '../../fixtures';
import { cell, noteChips, openFretboard, HIGH_E } from '../../helpers/fretboard';
import { isStackedLayout } from '../../helpers/viewport';

/**
 * Fretboard Explorer — the stacked layout (phones and small tablets).
 *
 * Below 860px the three rails collapse into one column and the order changes:
 * the neck comes first, then the controls, then the info rail — burying a
 * 15-fret board under a long control rail is what the design was avoiding.
 * The neck itself keeps its intrinsic width and scrolls sideways rather than
 * shrinking the notes to nothing.
 *
 * Run with: npx playwright test --project="iPhone 12" tests/e2e/mobile/fretboard-mobile.spec.ts
 *
 * Guarded on the width the layout keys off (see tests/helpers/viewport.ts),
 * never on Playwright's `isMobile` — that is true for tablets too.
 */

test.describe('Fretboard Explorer — stacked layout', { tag: ['@mobile', '@fretboard'] }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs, page }) => {
    test.setTimeout(90_000);
    test.skip(!isStackedLayout(page), 'Stacked-layout-only test');
    await loginAs('student');
    await openFretboard(page);
  });

  test('leads with the neck, then the controls, then the info rail', async ({ page }) => {
    const board = await page.locator('[data-testid="fb-board"]').boundingBox();
    const controls = await page.locator('[data-testid="fb-controls"]').boundingBox();
    const info = await page.locator('[data-testid="fb-info"]').boundingBox();

    expect(board).not.toBeNull();
    expect(controls).not.toBeNull();
    expect(info).not.toBeNull();
    expect(board!.y).toBeLessThan(controls!.y);
    expect(controls!.y).toBeLessThan(info!.y);
  });

  test('shows the rotate/scroll hint and keeps the page free of sideways scroll', async ({
    page,
  }) => {
    await expect(page.locator('[data-testid="fb-rotate-hint"]')).toBeVisible();

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding

    const box = await page.locator('[data-testid="fb-board"]').boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('the neck scrolls sideways at full size instead of shrinking', async ({ page }) => {
    const scroller = page.locator('[data-testid="fb-scroll"]');
    const metrics = await scroller.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);

    // Markers stay legible rather than collapsing with the viewport.
    const marker = await cell(page, HIGH_E, 5).boundingBox();
    expect(marker!.width).toBeGreaterThan(24);
    expect(marker!.height).toBeGreaterThan(24);

    // The far end of the neck is reachable by scrolling to it.
    await scroller.evaluate((el) => el.scrollTo({ left: el.scrollWidth }));
    await expect(cell(page, HIGH_E, 15)).toBeInViewport();
  });

  test('a position can be tapped to identify it', async ({ page }) => {
    const hasTouch = await page.evaluate(() => 'ontouchstart' in window);
    test.skip(!hasTouch, 'Touch-only test');

    await cell(page, HIGH_E, 5).tap();
    await expect(page.locator('[data-testid="fb-tapped"]')).toContainText('string 1');
    await expect(page.locator('[data-testid="fb-tapped"]')).toContainText('fret 5');
  });

  test('the full control rail stays usable in one column', async ({ page }) => {
    await page.locator('[data-testid="fb-key-C"]').click();
    await expect(cell(page, HIGH_E, 8)).toHaveAttribute('data-marker', 'root');

    await page.locator('[data-testid="fb-scale-select"]').selectOption('major');
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Major');

    await page.locator('[data-testid="fb-mode-chord"]').click();
    await page.locator('[data-testid="fb-chord-minor"]').click();
    await expect(noteChips(page)).toHaveCount(3);

    await page.locator('[data-testid="fb-toggle-intervals"]').click();
    await expect(cell(page, HIGH_E, 8)).toHaveText('R');

    // Still no sideways scroll on the page itself after all of that.
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });

  test('CAGED shapes and board finishes work on a phone too', async ({ page }) => {
    await page.locator('[data-testid="fb-caged-E"]').click();
    await expect(page.locator('[data-testid="fb-caged-zone-E"]')).toBeAttached();

    await page.locator('[data-testid="fb-style-mono"]').click();
    await expect(page.locator('[data-testid="fb-svg"]')).toHaveAttribute('data-style', 'mono');

    await expect(page.locator('[data-testid="fb-caged-card-E"]')).toHaveAttribute(
      'data-active',
      'true'
    );
  });
});

test.describe('Fretboard Explorer — wide layout', { tag: ['@fretboard'] }, () => {
  test.beforeEach(async ({ loginAs, page }) => {
    test.setTimeout(90_000);
    test.skip(isStackedLayout(page), 'Wide-layout-only test');
    await loginAs('student');
    await openFretboard(page);
  });

  test('keeps the three rails side by side and hides the rotate hint', async ({ page }) => {
    await expect(page.locator('[data-testid="fb-rotate-hint"]')).toBeHidden();

    const controls = await page.locator('[data-testid="fb-controls"]').boundingBox();
    const board = await page.locator('[data-testid="fb-board"]').boundingBox();
    const info = await page.locator('[data-testid="fb-info"]').boundingBox();

    // Left rail, board, right rail — in that order across the page.
    expect(controls!.x).toBeLessThan(board!.x);
    expect(board!.x).toBeLessThan(info!.x);
    // And the whole neck fits without a scroller.
    const metrics = await page.locator('[data-testid="fb-scroll"]').evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  });
});
