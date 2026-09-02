import { test, expect } from '../../fixtures';
import { cell, openFretboard, HIGH_E, A_STRING } from '../../helpers/fretboard';

/**
 * Fretboard Explorer — keyboard operation and assistive-tech surface.
 *
 * The neck is an SVG, so none of this comes for free: every position is an
 * explicit `role="button"` with a spoken label, a tab stop, and Enter/Space
 * handling. These tests are the guard on that — a refactor that turns the
 * markers back into decoration fails here.
 */

/** data-testid of whatever currently has focus. */
const focusedTestId = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.activeElement?.getAttribute('data-testid') ?? null);

test.describe('Fretboard Explorer — accessibility', { tag: ['@teacher', '@fretboard'] }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs, page }) => {
    test.setTimeout(90_000);
    await loginAs('admin');
    await openFretboard(page);
  });

  test('the board announces itself and every position on it', async ({ page }) => {
    await expect(page.locator('[data-testid="fb-svg"]')).toHaveAttribute(
      'aria-label',
      /6 strings and 15 frets/
    );

    await expect(cell(page, HIGH_E, 5)).toHaveAttribute(
      'aria-label',
      'A, root note, string 1 fret 5'
    );
    await expect(cell(page, A_STRING, 0)).toHaveAttribute(
      'aria-label',
      'A, root note, string 5 open'
    );
    await expect(cell(page, HIGH_E, 1)).toHaveAttribute('aria-label', 'F, string 1 fret 1');
    await expect(cell(page, HIGH_E, 5)).toHaveAttribute('role', 'button');
  });

  test('positions keep their spoken note name when the labels show intervals', async ({ page }) => {
    await page.locator('[data-testid="fb-toggle-intervals"]').click();

    await expect(cell(page, HIGH_E, 5)).toHaveText('R');
    // Screen readers still hear the note, not "R".
    await expect(cell(page, HIGH_E, 5)).toHaveAttribute(
      'aria-label',
      'A, root note, string 1 fret 5'
    );
  });

  test('flats reach assistive tech too', async ({ page }) => {
    await page.locator('[data-testid="fb-accidental-flat"]').click();
    await expect(cell(page, HIGH_E, 9)).toHaveAttribute('aria-label', 'Db, string 1 fret 9');
  });

  test('a position can be focused and identified with Enter and with Space', async ({ page }) => {
    const tapped = page.locator('[data-testid="fb-tapped"]');

    await cell(page, HIGH_E, 5).focus();
    expect(await focusedTestId(page)).toBe('fb-cell-0-5');
    await page.keyboard.press('Enter');
    await expect(tapped).toContainText('fret 5');

    await cell(page, A_STRING, 0).focus();
    await page.keyboard.press(' ');
    await expect(tapped).toContainText('string 5 · open');
  });

  test('Tab walks the neck in playing order', async ({ page, browserName }) => {
    // WebKit only tabs to non-form elements when full keyboard access is on,
    // which Playwright's build does not enable; the same DOM order is asserted
    // on Chromium and Firefox instead.
    test.skip(browserName === 'webkit', 'WebKit does not tab to tabindex on SVG by default');
    await cell(page, HIGH_E, 0).focus();
    await page.keyboard.press('Tab');
    expect(await focusedTestId(page)).toBe('fb-cell-0-1');
    await page.keyboard.press('Tab');
    expect(await focusedTestId(page)).toBe('fb-cell-0-2');
  });

  test('hidden positions leave the tab order entirely', async ({ page, browserName }) => {
    await page.locator('[data-testid="fb-toggle-hide-nonscale"]').click();

    const offScale = cell(page, HIGH_E, 1); // F — hidden in A pentatonic minor
    await expect(offScale).toHaveAttribute('aria-hidden', 'true');
    await expect(offScale).toHaveAttribute('tabindex', '-1');
    await expect(cell(page, HIGH_E, 5)).toHaveAttribute('tabindex', '0');

    // Tab from the open E skips the hidden F and F# and lands on G.
    test.skip(browserName === 'webkit', 'WebKit does not tab to tabindex on SVG by default');
    await cell(page, HIGH_E, 0).focus();
    await page.keyboard.press('Tab');
    expect(await focusedTestId(page)).toBe('fb-cell-0-3');
  });

  test('every control reports its pressed state', async ({ page }) => {
    const pairs = [
      ['fb-mode-scale', 'fb-mode-chord'],
      ['fb-accidental-sharp', 'fb-accidental-flat'],
      ['fb-style-engraved', 'fb-style-mono'],
    ] as const;

    for (const [selected, other] of pairs) {
      await expect(page.locator(`[data-testid="${selected}"]`)).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      await page.locator(`[data-testid="${other}"]`).click();
      await expect(page.locator(`[data-testid="${other}"]`)).toHaveAttribute(
        'aria-pressed',
        'true'
      );
      await expect(page.locator(`[data-testid="${selected}"]`)).toHaveAttribute(
        'aria-pressed',
        'false'
      );
    }

    // Display toggles are switches in all but name.
    const intervals = page.locator('[data-testid="fb-toggle-intervals"]');
    await expect(intervals).toHaveAttribute('aria-pressed', 'false');
    await intervals.click();
    await expect(intervals).toHaveAttribute('aria-pressed', 'true');
  });

  test('the pickers are reachable by their accessible names', async ({ page }) => {
    await expect(page.getByRole('combobox', { name: 'Scale' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Key of A' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Use flats' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'E shape' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No CAGED overlay' })).toBeVisible();
    await expect(page.getByRole('img', { name: /E shape, frets/ })).toBeVisible();

    await page.locator('[data-testid="fb-mode-chord"]').click();
    await expect(page.getByRole('button', { name: 'Minor chord, Am' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dominant 7th chord, A7' })).toBeVisible();
  });

  test('a mode chip is operable from the keyboard alone', async ({ page }) => {
    const chordMode = page.locator('[data-testid="fb-mode-chord"]');
    await expect(chordMode).toHaveAttribute('aria-pressed', 'false');

    await chordMode.focus();
    await page.keyboard.press('Enter');

    await expect(chordMode).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid="fb-chord-minor"]')).toBeVisible();

    const cKey = page.locator('[data-testid="fb-key-C"]');
    await cKey.focus();
    await page.keyboard.press(' ');
    await expect(cKey).toHaveAttribute('aria-pressed', 'true');
    await expect(cell(page, HIGH_E, 8)).toHaveAttribute('data-marker', 'root');
  });
});
