import { test, expect } from '../../fixtures';
import {
  cell,
  noteChips,
  openFretboard,
  waitForFretboardReady,
  HIGH_E,
} from '../../helpers/fretboard';

/**
 * Fretboard Explorer — what sits under the board: the chords of the key, the
 * shareable link, and the URL state that makes a view sendable to a student.
 *
 * The whole view lives in the query string (key, mode, scale/chord, caged,
 * style), written with replaceState as you work — so a reload restores what
 * you were looking at, and a pasted link opens it.
 */

test.describe('Fretboard Explorer — diatonic chords', { tag: ['@teacher', '@fretboard'] }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs, page }) => {
    test.setTimeout(90_000);
    await loginAs('admin');
    await openFretboard(page);
  });

  test('harmonises a major key as I ii iii IV V vi vii°', async ({ page }) => {
    await page.locator('[data-testid="fb-scale-major"]').click();

    await expect(page.locator('[data-testid="fb-diatonic"]')).toContainText('Triads in A');
    for (const [roman, chord] of [
      ['I', 'A'],
      ['ii', 'B'],
      ['iii', 'C#'],
      ['IV', 'D'],
      ['V', 'E'],
      ['vi', 'F#'],
      ['vii°', 'G#'],
    ] as const) {
      await expect(page.locator(`[data-testid="fb-diatonic-${roman}"]`)).toContainText(chord);
    }
  });

  test('harmonises a minor key as i ii° III iv v VI VII', async ({ page }) => {
    await page.locator('[data-testid="fb-scale-natural_minor"]').click();

    await expect(page.locator('[data-testid="fb-diatonic-i"]')).toContainText('A');
    await expect(page.locator('[data-testid="fb-diatonic-ii°"]')).toContainText('B');
    await expect(page.locator('[data-testid="fb-diatonic-III"]')).toContainText('C');
    await expect(page.locator('[data-testid="fb-diatonic-VII"]')).toContainText('G');
  });

  test('loads the chord you click straight onto the board', async ({ page }) => {
    await page.locator('[data-testid="fb-scale-major"]').click();
    await page.locator('[data-testid="fb-diatonic-vi"]').click();

    // vi of A major is F# minor.
    await expect(page.locator('[data-testid="fb-mode-chord"]')).toHaveAttribute(
      'data-active',
      'true'
    );
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('F#m');
    await expect(page.locator('[data-testid="fb-key-F#"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(noteChips(page)).toHaveCount(3);
    // Root F# on the high E string is fret 2.
    await expect(cell(page, HIGH_E, 2)).toHaveAttribute('data-marker', 'root');
  });

  test('a diminished degree loads as a diminished chord', async ({ page }) => {
    await page.locator('[data-testid="fb-scale-major"]').click();
    await page.locator('[data-testid="fb-diatonic-vii°"]').click();

    await expect(page.locator('[data-testid="fb-chord-diminished"]')).toHaveAttribute(
      'data-active',
      'true'
    );
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('G#dim');
  });

  test('says so when a scale or mode has no diatonic harmony to show', async ({ page }) => {
    // Pentatonics and blues have no seven-degree harmonisation.
    await expect(page.locator('[data-testid="fb-diatonic"]')).toContainText(
      'no seven-degree harmonisation'
    );
    await expect(page.locator('[data-testid="fb-diatonic-I"]')).toHaveCount(0);

    await page.locator('[data-testid="fb-mode-chord"]').click();
    await expect(page.locator('[data-testid="fb-diatonic"]')).toContainText('Switch to Scale mode');
  });
});

test.describe('Fretboard Explorer — shareable state', { tag: ['@teacher', '@fretboard'] }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs, page }) => {
    test.setTimeout(90_000);
    await loginAs('admin');
    await openFretboard(page);
  });

  test('the share card mirrors the address bar as you work', async ({ page }) => {
    const shareUrl = page.locator('[data-testid="fb-share-url"]');
    await expect(shareUrl).toHaveText(
      '/dashboard/fretboard?key=A&mode=scale&scale=pentatonic_minor'
    );

    await page.locator('[data-testid="fb-key-C"]').click();
    await page.locator('[data-testid="fb-scale-select"]').selectOption('dorian');
    await page.locator('[data-testid="fb-caged-G"]').click();

    await expect(shareUrl).toContainText('key=C');
    await expect(shareUrl).toContainText('scale=dorian');
    await expect(shareUrl).toContainText('caged=G');

    const shown = (await shareUrl.textContent()) ?? '';
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(shown);
  });

  test('copies the link to the clipboard', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Clipboard permissions are Chromium-only in Playwright');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.locator('[data-testid="fb-key-C"]').click();
    await page.locator('[data-testid="fb-copy-link"]').click();

    await expect(page.locator('[data-testid="fb-copy-link"]')).toHaveText('Copied');
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboard).toContain('/dashboard/fretboard?key=C');
  });

  test('a shared link opens the exact view it was copied from', async ({ page }) => {
    await openFretboard(page, '?key=C&mode=chord&chord=minor7&caged=A&style=mono');

    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Minor 7th · Cm7');
    await expect(page.locator('[data-testid="fb-chord-minor7"]')).toHaveAttribute(
      'data-active',
      'true'
    );
    await expect(page.locator('[data-testid="fb-caged-A"]')).toHaveAttribute('data-active', 'true');
    await expect(page.locator('[data-testid="fb-svg"]')).toHaveAttribute('data-style', 'mono');
    await expect(noteChips(page)).toHaveCount(4);
    await expect(cell(page, HIGH_E, 8)).toHaveAttribute('data-marker', 'root'); // C
  });

  test('a reload keeps the view you had built up', async ({ page }) => {
    await page.locator('[data-testid="fb-key-D"]').click();
    await page.locator('[data-testid="fb-scale-select"]').selectOption('lydian');
    await page.locator('[data-testid="fb-style-studio"]').click();

    await page.reload();
    await waitForFretboardReady(page);

    await expect(page.locator('[data-testid="fb-title"]')).toContainText('D');
    await expect(page.locator('[data-testid="fb-scale-select"]')).toHaveValue('lydian');
    await expect(page.locator('[data-testid="fb-svg"]')).toHaveAttribute('data-style', 'studio');
  });

  test('a malformed link degrades to the default view instead of erroring', async ({ page }) => {
    await openFretboard(page, '?key=zz&mode=bogus&scale=nope&chord=nope&caged=Z&style=neon');

    await expect(page.locator('[data-testid="fb-title"]')).toContainText('A');
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Pentatonic Minor');
    await expect(cell(page, HIGH_E, 5)).toHaveAttribute('data-marker', 'root');
    await expect(page.locator('[data-testid="fb-svg"]')).toHaveAttribute('data-style', 'engraved');
  });

  test('flat spellings survive the round trip as canonical keys', async ({ page }) => {
    await openFretboard(page, '?key=Bb&mode=scale&scale=major');

    // Bb normalises to A#; the board stays canonical while the label follows
    // the sharp/flat toggle.
    await expect(page.locator('[data-testid="fb-key-A#"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-testid="fb-accidental-flat"]').click();
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Bb');
  });

  test('offers a route on to the chord quiz', async ({ page }) => {
    const quiz = page.locator('[data-testid="fb-quiz-link"]');
    await expect(quiz).toHaveAttribute('href', '/dashboard/skills');

    await quiz.click();
    await expect(page).toHaveURL(/\/dashboard\/skills/, { timeout: 30_000 });
  });
});
