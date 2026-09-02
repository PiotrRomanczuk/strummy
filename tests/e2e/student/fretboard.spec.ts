import { test, expect } from '../../fixtures';

/**
 * Fretboard Explorer — student POV.
 *
 * Mirrors `tests/e2e/teacher/fretboard.spec.ts` for the mandatory
 * Admin/Teacher/Student coverage (`.claude/rules/playwright-testing.md`).
 * Admin + teacher share one dashboard view and are covered there; this file
 * confirms the same self-study tool works identically from a student
 * session revealed to the student "Resources" nav group on 2026-08-01
 * (`components/navigation/menu.constants.ts:203-209`). Nav-visibility itself
 * is already covered generically by `tests/e2e/dashboard/sidebar.spec.ts`
 * (DASH-002) — this file is about the feature working, not the link existing.
 *
 * Cell positions are deterministic from music theory (see the teacher spec's
 * header comment for the row0/fret formula).
 */

test.describe('Fretboard Explorer — student', { tag: ['@student', '@fretboard'] }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs, page }) => {
    test.setTimeout(90_000);
    await loginAs('student');
    await page.goto('/dashboard/fretboard');
    await expect(page.locator('[data-testid="fb-board"]')).toBeVisible({ timeout: 45_000 });
  });

  test('loads with the default A pentatonic minor view', async ({ page }) => {
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Pentatonic Minor');
    const rootCell = page.locator('[data-testid="fb-cell-0-5"]');
    await expect(rootCell).toHaveAttribute('data-note', 'A');
    await expect(rootCell).toHaveAttribute('data-root', 'true');
    // 6 strings × (open + 15 frets).
    await expect(page.locator('[data-testid^="fb-cell-"]')).toHaveCount(96);
  });

  test('changing the key moves the root and overlay', async ({ page }) => {
    await page.locator('[data-testid="fb-key-C"]').click();
    const cRoot = page.locator('[data-testid="fb-cell-0-8"]');
    await expect(cRoot).toHaveAttribute('data-note', 'C');
    await expect(cRoot).toHaveAttribute('data-root', 'true');
  });

  test('switching to chord mode highlights chord tones', async ({ page }) => {
    await page.locator('[data-testid="fb-mode-chord"]').click();
    await page.locator('[data-testid="fb-chord-minor"]').click();
    // Key is still A → A minor chord = A, C, E.
    await expect(page.locator('[data-testid="fb-cell-0-5"]')).toHaveAttribute(
      'data-active',
      'true'
    ); // A
    await expect(page.locator('[data-testid="fb-note-chip"]')).toHaveCount(3);
  });

  test('clicking a fret identifies the note', async ({ page }) => {
    await page.locator('[data-testid="fb-cell-0-5"]').click();
    await expect(page.locator('[data-testid="fb-tapped"]')).toContainText('string 1');
  });

  test('CAGED shapes, board finish and diatonic chords work for a student too', async ({
    page,
  }) => {
    await page.locator('[data-testid="fb-caged-E"]').click();
    await expect(page.locator('[data-testid="fb-caged-zone-E"]')).toBeAttached();

    await page.locator('[data-testid="fb-style-mono"]').click();
    await expect(page.locator('[data-testid="fb-svg"]')).toHaveAttribute('data-style', 'mono');

    await page.locator('[data-testid="fb-scale-major"]').click();
    await page.locator('[data-testid="fb-diatonic-vi"]').click();
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('F#m');
  });
});
