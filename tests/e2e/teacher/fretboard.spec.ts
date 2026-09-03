import { test, expect } from '../../fixtures';
import {
  cell,
  noteChips,
  openFretboard,
  HIGH_E,
  A_STRING,
  TOTAL_CELLS,
} from '../../helpers/fretboard';

/**
 * Fretboard Explorer — the board and its controls (admin POV).
 *
 * This is the core of the tool: the neck itself, the key/mode/scale/chord
 * pickers, the display toggles, click-to-identify, and the info rail. The rest
 * of the feature is covered by its siblings, so each file stays readable:
 *   - fretboard-caged.spec.ts     CAGED positions + board finishes
 *   - fretboard-playback.spec.ts  play/stop, tempo, volume, mute
 *   - fretboard-sharing.spec.ts   diatonic chords, URL state, share card
 *   - fretboard-a11y.spec.ts      keyboard operation and ARIA
 *   - ../mobile/fretboard-mobile.spec.ts   the stacked phone layout
 *   - ../cross-role/fretboard-roles.spec.ts  admin / teacher / student parity
 *
 * Nothing here writes to the database — the fretboard is pure client-side
 * theory — so the suite is safe to run against any stack.
 *
 * @see components/fretboard/Fretboard.tsx
 * @see tests/helpers/fretboard.ts for the row/fret vocabulary
 */

test.describe('Fretboard Explorer — board', { tag: ['@teacher', '@fretboard'] }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs, page }) => {
    // Serial mode prevents parallel dev-server overload; generous timeout for
    // first-compile + auth roundtrip under the full parallel suite.
    test.setTimeout(90_000);
    await loginAs('admin');
    await openFretboard(page);
  });

  test('opens on A pentatonic minor with a highlighted root', async ({ page }) => {
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('A');
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Pentatonic Minor');
    await expect(page.locator('[data-testid="fb-subhead"]')).toContainText('5 notes');

    const root = cell(page, HIGH_E, 5);
    await expect(root).toHaveAttribute('data-note', 'A');
    await expect(root).toHaveAttribute('data-root', 'true');
    await expect(root).toHaveAttribute('data-active', 'true');
    await expect(root).toHaveAttribute('data-marker', 'root');
    await expect(root).toHaveText('A');

    await expect(page.locator('[data-testid^="fb-cell-"]')).toHaveCount(TOTAL_CELLS);
    await expect(page.locator('[data-testid="fb-svg"]')).toBeVisible();
  });

  test('draws the open-string column left of the nut', async ({ page }) => {
    // Fret 0 is a real position: open high e and open A both sound.
    await expect(cell(page, HIGH_E, 0)).toHaveAttribute('data-note', 'E');
    await expect(cell(page, A_STRING, 0)).toHaveAttribute('data-note', 'A');
    // Open A is the root of the default key, so it is drawn as one.
    await expect(cell(page, A_STRING, 0)).toHaveAttribute('data-marker', 'root');
  });

  test('names only the tones in the overlay; everything else is a quiet dot', async ({ page }) => {
    // A pentatonic minor = A C D E G.
    await expect(cell(page, HIGH_E, 3)).toHaveAttribute('data-marker', 'active'); // G
    await expect(cell(page, HIGH_E, 3)).toHaveText('G');
    await expect(cell(page, HIGH_E, 1)).toHaveAttribute('data-marker', 'dim'); // F
    await expect(cell(page, HIGH_E, 1)).toHaveText('');
  });

  test('changing the key moves the root and the whole overlay', async ({ page }) => {
    await page.locator('[data-testid="fb-key-C"]').click();

    const cRoot = cell(page, HIGH_E, 8);
    await expect(cRoot).toHaveAttribute('data-note', 'C');
    await expect(cRoot).toHaveAttribute('data-marker', 'root');
    // C pentatonic minor is C D# F G A#, so the old A root leaves the overlay
    // altogether rather than staying on as an ordinary tone.
    await expect(cell(page, HIGH_E, 5)).toHaveAttribute('data-root', 'false');
    await expect(cell(page, HIGH_E, 5)).toHaveAttribute('data-marker', 'dim');
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('C');
  });

  test('every key in the chromatic grid is selectable', async ({ page }) => {
    const keys = page.locator('[data-testid^="fb-key-"]');
    await expect(keys).toHaveCount(12);
    await page.locator('[data-testid="fb-key-F#"]').click();
    await expect(page.locator('[data-testid="fb-key-F#"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('F#');
    // Root of F# pentatonic minor on the high E string is fret 2.
    await expect(cell(page, HIGH_E, 2)).toHaveAttribute('data-marker', 'root');
  });

  test('sharp/flat toggle respells the keys, the board and the title', async ({ page }) => {
    const cSharpKey = page.locator('[data-testid="fb-key-C#"]');
    await expect(cSharpKey).toHaveText('C#');

    await page.locator('[data-testid="fb-accidental-flat"]').click();
    await expect(cSharpKey).toHaveText('Db');
    await expect(page.locator('[data-testid="fb-accidental-flat"]')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    // A named C# on the board is respelled too; the note attribute stays canonical.
    await page.locator('[data-testid="fb-scale-major"]').click();
    await expect(cell(page, HIGH_E, 9)).toHaveAttribute('data-note', 'C#');
    await expect(cell(page, HIGH_E, 9)).toHaveText('Db');

    await cSharpKey.click();
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Db');
    await expect(noteChips(page).first()).toContainText('Db');
  });

  test('the scale dropdown offers every scale and drives the overlay', async ({ page }) => {
    await expect(page.locator('[data-testid="fb-scale-select"] option')).toHaveCount(12);

    await page.locator('[data-testid="fb-scale-select"]').selectOption('major');
    await page.locator('[data-testid="fb-key-C"]').click();

    // C major contains C but not C#.
    await expect(cell(page, HIGH_E, 8)).toHaveAttribute('data-marker', 'root');
    await expect(cell(page, HIGH_E, 9)).toHaveAttribute('data-marker', 'dim');
    await expect(noteChips(page)).toHaveCount(7);
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Major (Ionian)');
  });

  test('the four quick scales switch without opening the dropdown', async ({ page }) => {
    for (const [testId, expected] of [
      ['fb-scale-blues', 'Blues'],
      ['fb-scale-major', 'Major (Ionian)'],
      ['fb-scale-natural_minor', 'Natural Minor'],
      ['fb-scale-pentatonic_minor', 'Pentatonic Minor'],
    ] as const) {
      await page.locator(`[data-testid="${testId}"]`).click();
      await expect(page.locator('[data-testid="fb-title"]')).toContainText(expected);
      await expect(page.locator(`[data-testid="${testId}"]`)).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    }
    await expect(page.locator('[data-testid="fb-scale-select"]')).toHaveValue('pentatonic_minor');
  });

  test('chord mode swaps the scale picker for the chord grid', async ({ page }) => {
    await page.locator('[data-testid="fb-mode-chord"]').click();

    await expect(page.locator('[data-testid="fb-scale-select"]')).toHaveCount(0);
    await expect(page.locator('[data-testid^="fb-chord-"]')).toHaveCount(12);
    await expect(page.locator('[data-testid="fb-chord-minor"]')).toHaveAttribute(
      'data-active',
      'true'
    );

    // Key is still A → A minor = A, C, E.
    await expect(cell(page, HIGH_E, 5)).toHaveAttribute('data-marker', 'root'); // A
    await expect(cell(page, HIGH_E, 8)).toHaveAttribute('data-marker', 'active'); // C
    await expect(cell(page, HIGH_E, 10)).toHaveAttribute('data-marker', 'dim'); // D
    await expect(noteChips(page)).toHaveCount(3);
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Minor · Am');
  });

  test('dominant 7th lights the flat 7th, major 7th the natural one', async ({ page }) => {
    await page.locator('[data-testid="fb-mode-chord"]').click();

    await page.locator('[data-testid="fb-chord-dominant7"]').click();
    // A7 = A C# E G — G natural in, C natural out.
    await expect(cell(page, HIGH_E, 9)).toHaveAttribute('data-marker', 'active'); // C#
    await expect(cell(page, HIGH_E, 3)).toHaveAttribute('data-marker', 'active'); // G
    await expect(cell(page, HIGH_E, 8)).toHaveAttribute('data-marker', 'dim'); // C
    await expect(noteChips(page)).toHaveCount(4);
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('A7');

    await page.locator('[data-testid="fb-chord-major7"]').click();
    // Amaj7 = A C# E G# — G# in, G natural out.
    await expect(cell(page, HIGH_E, 4)).toHaveAttribute('data-marker', 'active'); // G#
    await expect(cell(page, HIGH_E, 3)).toHaveAttribute('data-marker', 'dim'); // G
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Amaj7');
  });

  test('power chords and suspensions render their two or three tones', async ({ page }) => {
    await page.locator('[data-testid="fb-mode-chord"]').click();

    await page.locator('[data-testid="fb-chord-power"]').click();
    await expect(noteChips(page)).toHaveCount(2); // A5 = A E
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('A5');

    await page.locator('[data-testid="fb-chord-sus4"]').click();
    await expect(noteChips(page)).toHaveCount(3); // Asus4 = A D E
    await expect(cell(page, HIGH_E, 10)).toHaveAttribute('data-marker', 'active'); // D
  });

  test('off mode names every note on the neck and empties the overlay', async ({ page }) => {
    await page.locator('[data-testid="fb-mode-off"]').click();

    await expect(page.locator('[data-testid="fb-scale-select"]')).toHaveCount(0);
    await expect(page.locator('[data-testid^="fb-chord-"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Chromatic');

    // Nothing belongs to an overlay, but every position is still named.
    await expect(cell(page, HIGH_E, 1)).toHaveAttribute('data-active', 'false');
    await expect(cell(page, HIGH_E, 1)).toHaveAttribute('data-marker', 'chromatic');
    await expect(cell(page, HIGH_E, 1)).toHaveText('F');
    // The root of the key is still marked, so you can orient yourself.
    await expect(cell(page, HIGH_E, 5)).toHaveAttribute('data-marker', 'root');

    await expect(noteChips(page)).toHaveCount(0);
    await expect(page.getByText('No notes selected.')).toBeVisible();
  });

  test('show-intervals swaps note names for interval names', async ({ page }) => {
    const root = cell(page, HIGH_E, 5);
    await expect(root).toHaveText('A');

    await page.locator('[data-testid="fb-toggle-intervals"]').click();

    await expect(root).toHaveText('R');
    await expect(cell(page, HIGH_E, 8)).toHaveText('b3'); // C over an A root
    await expect(page.locator('[data-testid="fb-toggle-intervals"]')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('hide-non-scale removes everything outside the overlay', async ({ page }) => {
    const offScale = cell(page, HIGH_E, 1); // F, not in A pentatonic minor
    await expect(offScale).toHaveAttribute('data-hidden', 'false');

    await page.locator('[data-testid="fb-toggle-hide-nonscale"]').click();

    await expect(offScale).toHaveAttribute('data-hidden', 'true');
    await expect(offScale).toHaveAttribute('data-marker', 'hidden');
    await expect(cell(page, HIGH_E, 5)).toHaveAttribute('data-hidden', 'false');

    await page.locator('[data-testid="fb-toggle-hide-nonscale"]').click();
    await expect(offScale).toHaveAttribute('data-hidden', 'false');
  });

  test('highlight-root demotes the root to an ordinary tone when switched off', async ({
    page,
  }) => {
    const root = cell(page, HIGH_E, 5);
    await expect(root).toHaveAttribute('data-marker', 'root');

    await page.locator('[data-testid="fb-toggle-highlight-root"]').click();

    await expect(root).toHaveAttribute('data-marker', 'active');
    await expect(root).toHaveAttribute('data-root', 'true'); // still the root, just not gold
    await expect(root).toHaveText('A');

    await page.locator('[data-testid="fb-toggle-highlight-root"]').click();
    await expect(root).toHaveAttribute('data-marker', 'root');
  });

  test('tapping a position identifies it, and the open string reads as open', async ({ page }) => {
    const tapped = page.locator('[data-testid="fb-tapped"]');
    await expect(tapped).toContainText('Tap a note');

    await cell(page, HIGH_E, 5).click();
    await expect(tapped).toContainText('A');
    await expect(tapped).toContainText('string 1');
    await expect(tapped).toContainText('fret 5');

    await cell(page, A_STRING, 0).click();
    await expect(tapped).toContainText('string 5 · open');

    // A note outside the overlay can be identified too.
    await cell(page, HIGH_E, 1).click();
    await expect(tapped).toContainText('F');
    await expect(tapped).toContainText('fret 1');
  });

  test('the info rail explains the current selection', async ({ page }) => {
    const formula = page.locator('[data-testid="fb-scale-formula"]');
    await expect(formula).toContainText('R – b3 – 4 – 5 – b7');
    await expect(formula).toContainText('WH-W-W-WH-W');
    await expect(noteChips(page).first()).toContainText('R');
    await expect(noteChips(page).first()).toContainText('A');
    await expect(page.locator('[data-testid="fb-info-description"]')).toContainText('blues');

    await page.locator('[data-testid="fb-scale-select"]').selectOption('major');
    await expect(formula).toContainText('R – 2 – 3 – 4 – 5 – 6 – 7');
    await expect(formula).toContainText('W-W-H-W-W-W-H');

    // Chord mode replaces the scale notes with chord tones and drops the formula.
    await page.locator('[data-testid="fb-mode-chord"]').click();
    await expect(formula).toHaveCount(0);
    await expect(page.locator('[data-testid="fb-info-notes"]')).toBeVisible();
    await expect(page.locator('[data-testid="fb-info-description"]')).toContainText('3rd');
  });
});
