import { test, expect } from '../../fixtures';

/**
 * Fretboard Explorer E2E Tests
 *
 * Covers the interactive fretboard at /dashboard/fretboard:
 *  - key selector + sharp/flat relabeling
 *  - scale overlays (quick buttons + dropdown) and chord-tone overlays
 *  - display toggles (intervals, hide non-scale, highlight root)
 *  - CAGED overlay: neck zones and the info-rail thumbnails
 *  - board finish (studio / engraved / mono)
 *  - click-to-identify a note, and the scale walkthrough
 *  - diatonic chords + the shareable URL state (read + write)
 *
 * The board is one SVG: six strings × (open + 15 frets), each position a
 * focusable `fb-cell-{row}-{fret}` group. Cell positions are deterministic
 * from music theory. The high-E string is row 0; on it the note at fret f is
 * CHROMATIC[(4 + f) % 12]. Examples used:
 *   row0/fret5  → A,  row0/fret8 → C,  row0/fret9 → C#,  row0/fret10 → D
 */

test.describe('Fretboard Explorer', { tag: ['@teacher', '@fretboard'] }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs, page }) => {
    // Serial mode prevents parallel dev-server overload; generous timeout for
    // first-compile + auth roundtrip under the full parallel suite.
    test.setTimeout(90_000);
    await loginAs('admin');
    await page.goto('/dashboard/fretboard');
    await expect(page.locator('[data-testid="fb-board"]')).toBeVisible({ timeout: 45_000 });
  });

  test('loads with the default A pentatonic minor view and a root highlight', async ({ page }) => {
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Pentatonic Minor');
    const rootCell = page.locator('[data-testid="fb-cell-0-5"]');
    await expect(rootCell).toHaveAttribute('data-note', 'A');
    await expect(rootCell).toHaveAttribute('data-root', 'true');
    await expect(rootCell).toHaveAttribute('data-active', 'true');
    // 6 strings × (open + 15 frets) = 96 interactive cells.
    await expect(page.locator('[data-testid^="fb-cell-"]')).toHaveCount(96);
    // The open-string column is part of the board.
    await expect(page.locator('[data-testid="fb-cell-0-0"]')).toHaveAttribute('data-note', 'E');
  });

  test('changing the key moves the root and overlay', async ({ page }) => {
    await page.locator('[data-testid="fb-key-C"]').click();
    // C pentatonic minor: root C sits at high-E fret 8.
    const cRoot = page.locator('[data-testid="fb-cell-0-8"]');
    await expect(cRoot).toHaveAttribute('data-note', 'C');
    await expect(cRoot).toHaveAttribute('data-root', 'true');
    await expect(cRoot).toHaveAttribute('data-active', 'true');
    // The former A root is no longer the root.
    await expect(page.locator('[data-testid="fb-cell-0-5"]')).toHaveAttribute('data-root', 'false');
  });

  test('sharp/flat toggle relabels notes', async ({ page }) => {
    const cSharpKey = page.locator('[data-testid="fb-key-C#"]');
    await expect(cSharpKey).toHaveText('C#');
    await page.locator('[data-testid="fb-accidental-flat"]').click();
    await expect(cSharpKey).toHaveText('Db');
    // A labelled C# on the board is relabeled too — pick a scale containing it.
    await page.locator('[data-testid="fb-scale-select"]').selectOption('major');
    const cSharpCell = page.locator('[data-testid="fb-cell-0-9"]');
    await expect(cSharpCell).toHaveAttribute('data-note', 'C#');
    await expect(cSharpCell).toHaveText('Db');
  });

  test('scale overlay reflects the selected scale', async ({ page }) => {
    await page.locator('[data-testid="fb-scale-select"]').selectOption('major');
    // C is not the key yet (key is A). Switch to C major for an easy check.
    await page.locator('[data-testid="fb-key-C"]').click();
    // C major contains C (in scale) but not C# (out of scale).
    await expect(page.locator('[data-testid="fb-cell-0-8"]')).toHaveAttribute(
      'data-active',
      'true'
    ); // C
    await expect(page.locator('[data-testid="fb-cell-0-9"]')).toHaveAttribute(
      'data-active',
      'false'
    ); // C#
    await expect(page.locator('[data-testid="fb-note-chip"]')).toHaveCount(7);
  });

  test('the quick scale buttons switch scales without the dropdown', async ({ page }) => {
    await page.locator('[data-testid="fb-scale-blues"]').click();
    await expect(page.locator('[data-testid="fb-scale-select"]')).toHaveValue('blues');
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Blues');
  });

  test('the info panel shows the interval and step formula for the selected scale', async ({
    page,
  }) => {
    await page.locator('[data-testid="fb-scale-select"]').selectOption('major');
    const formula = page.locator('[data-testid="fb-scale-formula"]');
    await expect(formula).toContainText('R – 2 – 3 – 4 – 5 – 6 – 7');
    await expect(formula).toContainText('W-W-H-W-W-W-H');

    await page.locator('[data-testid="fb-scale-select"]').selectOption('pentatonic_minor');
    await expect(formula).toContainText('WH-W-W-WH-W');
  });

  test('chord mode highlights chord tones', async ({ page }) => {
    await page.locator('[data-testid="fb-mode-chord"]').click();
    await page.locator('[data-testid="fb-chord-minor"]').click();
    // Key is still A → A minor chord = A, C, E.
    await expect(page.locator('[data-testid="fb-cell-0-5"]')).toHaveAttribute(
      'data-active',
      'true'
    ); // A
    await expect(page.locator('[data-testid="fb-cell-0-8"]')).toHaveAttribute(
      'data-active',
      'true'
    ); // C
    await expect(page.locator('[data-testid="fb-cell-0-10"]')).toHaveAttribute(
      'data-active',
      'false'
    ); // D
    await expect(page.locator('[data-testid="fb-note-chip"]')).toHaveCount(3);
  });

  test('show-intervals toggle swaps note names for interval names', async ({ page }) => {
    const rootCell = page.locator('[data-testid="fb-cell-0-5"]');
    await expect(rootCell).toHaveText('A');
    await page.locator('[data-testid="fb-toggle-intervals"]').click();
    await expect(rootCell).toHaveText('R');
  });

  test('hide-non-scale toggle hides notes outside the scale', async ({ page }) => {
    const offScale = page.locator('[data-testid="fb-cell-0-1"]'); // F, not in A pent minor
    await expect(offScale).toHaveAttribute('data-hidden', 'false');
    await page.locator('[data-testid="fb-toggle-hide-nonscale"]').click();
    await expect(offScale).toHaveAttribute('data-hidden', 'true');
    // In-scale notes remain visible.
    await expect(page.locator('[data-testid="fb-cell-0-5"]')).toHaveAttribute(
      'data-hidden',
      'false'
    );
  });

  test('clicking a fret identifies the note, and the open string reads as open', async ({
    page,
  }) => {
    await expect(page.locator('[data-testid="fb-tapped"]')).toContainText('Tap a note');
    await page.locator('[data-testid="fb-cell-0-5"]').click();
    const tapped = page.locator('[data-testid="fb-tapped"]');
    await expect(tapped).toContainText('A');
    await expect(tapped).toContainText('string 1');
    await expect(tapped).toContainText('fret 5');

    await page.locator('[data-testid="fb-cell-0-0"]').click();
    await expect(tapped).toContainText('string 1 · open');
  });

  test('CAGED overlay draws a zone on the neck and lists shapes in the rail', async ({ page }) => {
    await expect(page.locator('[data-testid^="fb-caged-zone-"]')).toHaveCount(0);

    await page.locator('[data-testid="fb-caged-E"]').click();
    await expect(page.locator('[data-testid="fb-caged-zone-E"]')).toBeAttached();

    await page.locator('[data-testid="fb-caged-all"]').click();
    const zones = await page.locator('[data-testid^="fb-caged-zone-"]').count();
    expect(zones).toBeGreaterThan(1);

    await page.locator('[data-testid="fb-caged-none"]').click();
    await expect(page.locator('[data-testid^="fb-caged-zone-"]')).toHaveCount(0);

    // The rail thumbnails select the same shapes.
    const card = page.locator('[data-testid^="fb-caged-card-"]').first();
    await card.click();
    await expect(card).toHaveAttribute('data-active', 'true');
    await expect(page.locator('[data-testid^="fb-caged-zone-"]')).toHaveCount(1);
  });

  test('the style control switches the board finish', async ({ page }) => {
    await expect(page.locator('[data-testid="fb-svg"]')).toHaveAttribute('data-style', 'engraved');
    await page.locator('[data-testid="fb-style-studio"]').click();
    await expect(page.locator('[data-testid="fb-svg"]')).toHaveAttribute('data-style', 'studio');
    await expect(page).toHaveURL(/style=studio/);
  });

  test('diatonic chords load the chord they name', async ({ page }) => {
    await page.locator('[data-testid="fb-scale-select"]').selectOption('major');
    await expect(page.locator('[data-testid="fb-diatonic-I"]')).toContainText('A');
    await page.locator('[data-testid="fb-diatonic-vi"]').click();
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('F#m');
  });

  test('the walkthrough starts and stops', async ({ page }) => {
    const play = page.locator('[data-testid="fb-play"]');
    await expect(play).toHaveAttribute('data-playing', 'false');
    await play.click();
    await expect(play).toHaveAttribute('data-playing', 'true');
    await play.click();
    await expect(play).toHaveAttribute('data-playing', 'false');
  });

  test('selections are written to the URL and mirrored in the share card', async ({ page }) => {
    await page.locator('[data-testid="fb-key-C"]').click();
    await page.locator('[data-testid="fb-scale-select"]').selectOption('major');
    await expect(page).toHaveURL(/key=C/);
    await expect(page).toHaveURL(/scale=major/);
    await expect(page.locator('[data-testid="fb-share-url"]')).toContainText('key=C');
    await expect(page.locator('[data-testid="fb-share-url"]')).toContainText('scale=major');
  });

  test('a shared URL restores the view', async ({ page }) => {
    await page.goto('/dashboard/fretboard?key=C&mode=scale&scale=major&caged=E');
    await expect(page.locator('[data-testid="fb-board"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('C');
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Major');
    await expect(page.locator('[data-testid="fb-scale-select"]')).toHaveValue('major');
    await expect(page.locator('[data-testid="fb-cell-0-8"]')).toHaveAttribute('data-root', 'true');
    await expect(page.locator('[data-testid="fb-caged-E"]')).toHaveAttribute('data-active', 'true');
  });

  test('malformed URL params fall back to the default state instead of erroring', async ({
    page,
  }) => {
    await page.goto('/dashboard/fretboard?key=zz&mode=bogus&scale=nope&chord=nope&caged=Z');
    await expect(page.locator('[data-testid="fb-board"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Pentatonic Minor');
    await expect(page.locator('[data-testid="fb-cell-0-5"]')).toHaveAttribute('data-root', 'true');
  });

  test('dominant 7th chord highlights root, 3rd, 5th and flat-7th only', async ({ page }) => {
    await page.locator('[data-testid="fb-mode-chord"]').click();
    await page.locator('[data-testid="fb-chord-dominant7"]').click();
    // Key is A → A7 = A, C#, E, G (not C natural, not G#).
    await expect(page.locator('[data-testid="fb-cell-0-5"]')).toHaveAttribute(
      'data-active',
      'true'
    ); // A
    await expect(page.locator('[data-testid="fb-cell-0-9"]')).toHaveAttribute(
      'data-active',
      'true'
    ); // C#
    await expect(page.locator('[data-testid="fb-cell-0-3"]')).toHaveAttribute(
      'data-active',
      'true'
    ); // G
    await expect(page.locator('[data-testid="fb-cell-0-8"]')).toHaveAttribute(
      'data-active',
      'false'
    ); // C natural
    await expect(page.locator('[data-testid="fb-note-chip"]')).toHaveCount(4);
  });

  test('major 7th chord highlights the natural 7th, not the flat 7th', async ({ page }) => {
    await page.locator('[data-testid="fb-mode-chord"]').click();
    await page.locator('[data-testid="fb-chord-major7"]').click();
    // Key is A → Amaj7 = A, C#, E, G# (not G natural).
    await expect(page.locator('[data-testid="fb-cell-0-4"]')).toHaveAttribute(
      'data-active',
      'true'
    ); // G#
    await expect(page.locator('[data-testid="fb-cell-0-3"]')).toHaveAttribute(
      'data-active',
      'false'
    ); // G natural
    await expect(page.locator('[data-testid="fb-note-chip"]')).toHaveCount(4);
  });

  test('scale select and chord buttons expose accessible names', async ({ page }) => {
    await expect(page.getByRole('combobox', { name: 'Scale' })).toBeVisible();
    await page.locator('[data-testid="fb-mode-chord"]').click();
    await expect(page.getByRole('button', { name: 'Minor chord, Am' })).toBeVisible();
  });

  test('keyboard: activating a mode chip with Enter toggles aria-pressed and reveals the chords', async ({
    page,
  }) => {
    const chordMode = page.locator('[data-testid="fb-mode-chord"]');
    await expect(chordMode).toHaveAttribute('aria-pressed', 'false');
    await chordMode.focus();
    await page.keyboard.press('Enter');
    await expect(chordMode).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid="fb-chord-minor"]')).toBeVisible();
  });

  test('keyboard: activating a key chip with Space moves the root', async ({ page }) => {
    const cKey = page.locator('[data-testid="fb-key-C"]');
    await cKey.focus();
    await page.keyboard.press(' ');
    await expect(cKey).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid="fb-cell-0-8"]')).toHaveAttribute('data-root', 'true');
  });

  test('keyboard: a board cell can be identified with Enter', async ({ page }) => {
    const rootCell = page.locator('[data-testid="fb-cell-0-5"]');
    await rootCell.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="fb-tapped"]')).toContainText('fret 5');
  });

  test('hidden (non-scale) cells are removed from the keyboard tab order', async ({ page }) => {
    const offScale = page.locator('[data-testid="fb-cell-0-1"]'); // F, not in A pent minor
    await page.locator('[data-testid="fb-toggle-hide-nonscale"]').click();
    await expect(offScale).toHaveAttribute('aria-hidden', 'true');
    await expect(offScale).toHaveAttribute('tabindex', '-1');
    // A visible, in-scale cell stays in the tab order.
    await expect(page.locator('[data-testid="fb-cell-0-5"]')).toHaveAttribute('tabindex', '0');
  });

  // Mobile-only cases — the layout collapses to a single stacked column below
  // 860px (see `.ui-fret-layout` in app/design-tokens.css) and the neck keeps
  // its intrinsic width inside a horizontal scroller. These confirm the board
  // and controls stay usable and don't overflow at a real mobile viewport,
  // matching the `isMobile` + `test.skip` pattern used in
  // `tests/e2e/mobile/mobile-responsiveness.spec.ts`.
  test('mobile: board and controls fit the viewport without horizontal overflow', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Mobile-only test');

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1 for rounding

    const board = page.locator('[data-testid="fb-board"]');
    await expect(board).toBeVisible();
    const boardBox = await board.boundingBox();
    if (boardBox) {
      expect(boardBox.x).toBeGreaterThanOrEqual(0);
      expect(boardBox.x + boardBox.width).toBeLessThanOrEqual(viewportWidth + 1);
    }

    // The rotate/scroll hint only shows where the neck cannot fit.
    await expect(page.locator('[data-testid="fb-rotate-hint"]')).toBeVisible();
  });

  test('mobile: key/scale/chord/interval controls remain reachable and usable', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'Mobile-only test');

    // Key selector is tappable and updates the board (same C-root check as
    // the desktop "changing the key" case above).
    await page.locator('[data-testid="fb-key-C"]').click();
    await expect(page.locator('[data-testid="fb-cell-0-8"]')).toHaveAttribute('data-root', 'true');

    // Scale select stays reachable and updates the title.
    await page.locator('[data-testid="fb-scale-select"]').selectOption('major');
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Major');

    // Chord mode toggle + chord buttons remain reachable and tappable.
    await page.locator('[data-testid="fb-mode-chord"]').click();
    await page.locator('[data-testid="fb-chord-minor"]').click();
    await expect(page.locator('[data-testid="fb-note-chip"]').first()).toBeVisible();

    // Interval toggle remains reachable.
    await page.locator('[data-testid="fb-toggle-intervals"]').click();
    await expect(page.locator('[data-testid="fb-cell-0-8"]')).toHaveText('R');

    // None of the interactions above introduced horizontal overflow.
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
  });
});
