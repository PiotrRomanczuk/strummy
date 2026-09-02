import { test, expect } from '../../fixtures';
import { cell, noteChips, openFretboard, HIGH_E, G_STRING } from '../../helpers/fretboard';
import { isStackedLayout } from '../../helpers/viewport';

/**
 * Fretboard Explorer — the student's self-study journey.
 *
 * Role parity itself is covered once, for all three roles, in
 * `tests/e2e/cross-role/fretboard-roles.spec.ts`; the feature-by-feature depth
 * lives in `tests/e2e/teacher/fretboard*.spec.ts`. What is student-specific is
 * how the tool is *reached* and *used to learn*: from the Resources nav group
 * (revealed to students on 2026-08-01,
 * `components/navigation/menu.constants.ts`), then a shape learned by ear and
 * by interval, and the hand-off to the chord quiz.
 */

test.describe('Fretboard Explorer — student', { tag: ['@student', '@fretboard'] }, () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ loginAs }) => {
    test.setTimeout(90_000);
    await loginAs('student');
  });

  test('is reachable from the student sidebar', async ({ page }) => {
    test.skip(isStackedLayout(page), 'The sidebar collapses into a sheet below the md breakpoint');

    await page.goto('/dashboard');
    await page.locator('[data-nav-item="Fretboard"]').first().click();

    await expect(page).toHaveURL(/\/dashboard\/fretboard/);
    await expect(page.locator('[data-testid="fb-board"]')).toBeVisible({ timeout: 45_000 });
  });

  test('learns a shape: hear it, hide the noise, then read the intervals', async ({ page }) => {
    await openFretboard(page);

    // The A minor pentatonic box everyone starts with.
    await expect(page.locator('[data-testid="fb-title"]')).toContainText('Pentatonic Minor');
    await expect(noteChips(page)).toHaveCount(5);

    // Hear a note by tapping it.
    await cell(page, G_STRING, 2).click();
    await expect(page.locator('[data-testid="fb-tapped"]')).toContainText('A');
    await expect(page.locator('[data-testid="fb-tapped"]')).toContainText('string 3');

    // Strip the board down to the shape itself.
    await page.locator('[data-testid="fb-toggle-hide-nonscale"]').click();
    await expect(cell(page, HIGH_E, 1)).toHaveAttribute('data-hidden', 'true');
    await expect(cell(page, HIGH_E, 5)).toHaveAttribute('data-hidden', 'false');

    // Then learn what the notes are doing, not just what they are called.
    await page.locator('[data-testid="fb-toggle-intervals"]').click();
    await expect(cell(page, HIGH_E, 5)).toHaveText('R');
    await expect(cell(page, HIGH_E, 8)).toHaveText('b3');
    await expect(page.locator('[data-testid="fb-scale-formula"]')).toContainText('R – b3 – 4');
  });

  test('checks a chord from a song against the neck', async ({ page }) => {
    await openFretboard(page, '?key=G&mode=chord&chord=major');

    await expect(page.locator('[data-testid="fb-title"]')).toContainText('G');
    await expect(noteChips(page)).toHaveCount(3);
    // G major = G B D; the open G string is the root.
    await expect(cell(page, G_STRING, 0)).toHaveAttribute('data-marker', 'root');
    await expect(page.locator('[data-testid="fb-info-description"]')).toContainText('perfect 5th');

    // And where to put the fingers: the E-shape window for G sits at fret 3.
    await page.locator('[data-testid="fb-caged-E"]').click();
    await expect(page.locator('[data-testid="fb-mini-caged-E"]')).toHaveAttribute(
      'aria-label',
      'E shape, frets 3 to 6'
    );
  });

  test('can carry on to the chord quiz', async ({ page }) => {
    await openFretboard(page);
    await page.locator('[data-testid="fb-quiz-link"]').click();
    await expect(page).toHaveURL(/\/dashboard\/skills/, { timeout: 30_000 });
  });
});
