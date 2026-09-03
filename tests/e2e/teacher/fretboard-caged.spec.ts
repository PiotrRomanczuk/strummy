import { test, expect } from '../../fixtures';
import { cell, openFretboard, HIGH_E } from '../../helpers/fretboard';

/**
 * Fretboard Explorer — CAGED positions and board finishes.
 *
 * The five CAGED windows are derived, not fixture data: for the key of A on a
 * 15-fret neck they are A(0–3), G(2–7), E(5–8), D(7–10) and C(9–13), ordered
 * from the nut up. Moving the key moves every window with it, which is what
 * makes the shapes worth drawing at all.
 *
 * @see lib/music-theory/caged.ts
 * @see components/fretboard/MiniCAGED.tsx
 */

test.describe('Fretboard Explorer — CAGED', { tag: ['@teacher', '@fretboard'] }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs, page }) => {
    test.setTimeout(90_000);
    await loginAs('admin');
    await openFretboard(page);
  });

  test('starts with no overlay and draws one window per selected shape', async ({ page }) => {
    await expect(page.locator('[data-testid^="fb-caged-zone-"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="fb-caged-none"]')).toHaveAttribute(
      'data-active',
      'true'
    );

    await page.locator('[data-testid="fb-caged-E"]').click();
    await expect(page.locator('[data-testid^="fb-caged-zone-"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="fb-caged-zone-E"]')).toContainText('E-SHAPE');

    await page.locator('[data-testid="fb-caged-D"]').click();
    await expect(page.locator('[data-testid="fb-caged-zone-D"]')).toBeAttached();
    await expect(page.locator('[data-testid="fb-caged-zone-E"]')).toHaveCount(0);

    await page.locator('[data-testid="fb-caged-all"]').click();
    await expect(page.locator('[data-testid^="fb-caged-zone-"]')).toHaveCount(5);

    await page.locator('[data-testid="fb-caged-none"]').click();
    await expect(page.locator('[data-testid^="fb-caged-zone-"]')).toHaveCount(0);
  });

  test('the rail lists all five shapes for the key, nut-first', async ({ page }) => {
    const cards = page.locator('[data-testid^="fb-caged-card-"]');
    await expect(cards).toHaveCount(5);
    await expect(page.locator('[data-testid="fb-caged-count"]')).toHaveText('5 shapes');

    // Ordered by where they sit on the neck: A(0) G(2) E(5) D(7) C(9).
    for (const [index, shape] of ['A', 'G', 'E', 'D', 'C'].entries()) {
      await expect(cards.nth(index)).toHaveAttribute('data-testid', `fb-caged-card-${shape}`);
    }
  });

  test('each thumbnail names the fret window it covers', async ({ page }) => {
    await expect(page.locator('[data-testid="fb-mini-caged-E"]')).toHaveAttribute(
      'aria-label',
      'E shape, frets 5 to 8'
    );
    await expect(page.locator('[data-testid="fb-mini-caged-A"]')).toHaveAttribute(
      'aria-label',
      'A shape, frets 0 to 3'
    );

    // The windows move with the key: in C the E-shape sits three frets higher.
    await page.locator('[data-testid="fb-key-C"]').click();
    await expect(page.locator('[data-testid="fb-mini-caged-E"]')).toHaveAttribute(
      'aria-label',
      'E shape, frets 8 to 11'
    );
  });

  test('a thumbnail selects its shape, and clicking it again clears the overlay', async ({
    page,
  }) => {
    const eCard = page.locator('[data-testid="fb-caged-card-E"]');

    await eCard.click();
    await expect(eCard).toHaveAttribute('data-active', 'true');
    await expect(page.locator('[data-testid="fb-caged-E"]')).toHaveAttribute('data-active', 'true');
    await expect(page.locator('[data-testid="fb-caged-zone-E"]')).toBeAttached();

    await eCard.click();
    await expect(eCard).toHaveAttribute('data-active', 'false');
    await expect(page.locator('[data-testid^="fb-caged-zone-"]')).toHaveCount(0);
  });

  test('the overlay is a lens, not a filter — the notes underneath are unchanged', async ({
    page,
  }) => {
    await page.locator('[data-testid="fb-caged-E"]').click();

    // Inside the window and outside it, the scale reads exactly as before.
    await expect(cell(page, HIGH_E, 5)).toHaveAttribute('data-marker', 'root'); // in E-shape
    await expect(cell(page, HIGH_E, 12)).toHaveAttribute('data-marker', 'active'); // outside it
    await expect(cell(page, HIGH_E, 1)).toHaveAttribute('data-marker', 'dim');
  });

  test('the selected shape survives a reload through the URL', async ({ page }) => {
    await page.locator('[data-testid="fb-caged-G"]').click();
    await expect(page).toHaveURL(/caged=G/);

    await openFretboard(page, '?key=A&mode=scale&scale=pentatonic_minor&caged=D');
    await expect(page.locator('[data-testid="fb-caged-D"]')).toHaveAttribute('data-active', 'true');
    await expect(page.locator('[data-testid="fb-caged-zone-D"]')).toBeAttached();
  });

  test('an unknown shape in the URL falls back to no overlay', async ({ page }) => {
    await openFretboard(page, '?caged=Z');
    await expect(page.locator('[data-testid="fb-caged-none"]')).toHaveAttribute(
      'data-active',
      'true'
    );
    await expect(page.locator('[data-testid^="fb-caged-zone-"]')).toHaveCount(0);
  });
});

test.describe('Fretboard Explorer — board finish', { tag: ['@teacher', '@fretboard'] }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs, page }) => {
    test.setTimeout(90_000);
    await loginAs('admin');
    await openFretboard(page);
  });

  test('switches between the three finishes and remembers the choice', async ({ page }) => {
    const board = page.locator('[data-testid="fb-svg"]');
    await expect(board).toHaveAttribute('data-style', 'engraved');

    await page.locator('[data-testid="fb-style-studio"]').click();
    await expect(board).toHaveAttribute('data-style', 'studio');
    await expect(page.locator('[data-testid="fb-style-studio"]')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page).toHaveURL(/style=studio/);

    await page.locator('[data-testid="fb-style-mono"]').click();
    await expect(board).toHaveAttribute('data-style', 'mono');
    await expect(page).toHaveURL(/style=mono/);

    // Engraved is the default, so it drops out of the URL rather than pinning it.
    await page.locator('[data-testid="fb-style-engraved"]').click();
    await expect(board).toHaveAttribute('data-style', 'engraved');
    await expect(page).not.toHaveURL(/style=/);
  });

  test('a finish from the URL is restored, and the notes are untouched by it', async ({ page }) => {
    await openFretboard(page, '?key=A&mode=scale&scale=pentatonic_minor&style=studio');

    await expect(page.locator('[data-testid="fb-svg"]')).toHaveAttribute('data-style', 'studio');
    await expect(page.locator('[data-testid="fb-style-studio"]')).toHaveAttribute(
      'data-active',
      'true'
    );
    await expect(cell(page, HIGH_E, 5)).toHaveAttribute('data-marker', 'root');
    await expect(cell(page, HIGH_E, 5)).toHaveText('A');
  });

  test('an unknown finish in the URL falls back to engraved', async ({ page }) => {
    await openFretboard(page, '?style=neon');
    await expect(page.locator('[data-testid="fb-svg"]')).toHaveAttribute('data-style', 'engraved');
  });
});
