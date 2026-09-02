import { test, expect } from '../../fixtures';
import { cell, noteChips, openFretboard, HIGH_E, TOTAL_CELLS } from '../../helpers/fretboard';

/**
 * Fretboard Explorer — role parity (Admin · Teacher · Student).
 *
 * The tool is deliberately identical for all three roles: it reads no data and
 * writes none, so there is nothing to scope per role — a teacher demonstrating
 * a shape and a student practising it must see the same neck. These tests are
 * what keeps that true, and satisfy the mandatory role coverage in
 * `.claude/rules/playwright-testing.md`.
 *
 * The deeper per-feature coverage lives in tests/e2e/teacher/fretboard*.spec.ts;
 * this file walks the whole tool once per role.
 */

const ROLES = ['admin', 'teacher', 'student'] as const;

test.describe('Fretboard Explorer — every role', { tag: ['@cross-role', '@fretboard'] }, () => {
  test.describe.configure({ mode: 'serial' });

  for (const role of ROLES) {
    test(`${role} can explore the whole board`, async ({ loginAs, page }) => {
      test.setTimeout(120_000);
      await loginAs(role);
      await openFretboard(page);

      // 1. The default view, identical for everyone.
      await expect(page.locator('[data-testid="fb-title"]')).toContainText('Pentatonic Minor');
      await expect(page.locator('[data-testid^="fb-cell-"]')).toHaveCount(TOTAL_CELLS);
      await expect(cell(page, HIGH_E, 5)).toHaveAttribute('data-marker', 'root');

      // 2. Pick a key and a scale.
      await page.locator('[data-testid="fb-key-C"]').click();
      await page.locator('[data-testid="fb-scale-major"]').click();
      await expect(cell(page, HIGH_E, 8)).toHaveAttribute('data-marker', 'root');
      await expect(noteChips(page)).toHaveCount(7);

      // 3. The chords of that key are offered, and load on click.
      await expect(page.locator('[data-testid="fb-diatonic-V"]')).toContainText('G');
      await page.locator('[data-testid="fb-diatonic-V"]').click();
      await expect(page.locator('[data-testid="fb-title"]')).toContainText('G');
      await expect(noteChips(page)).toHaveCount(3);

      // 4. A CAGED window can be laid over the neck.
      await page.locator('[data-testid="fb-caged-E"]').click();
      await expect(page.locator('[data-testid="fb-caged-zone-E"]')).toBeAttached();

      // 5. Any position identifies itself.
      await cell(page, HIGH_E, 3).click();
      await expect(page.locator('[data-testid="fb-tapped"]')).toContainText('string 1');

      // 6. Playback is available to everyone.
      const play = page.locator('[data-testid="fb-play"]');
      await play.click();
      await expect(play).toHaveAttribute('data-playing', 'true');
      await play.click();
      await expect(play).toHaveAttribute('data-playing', 'false');

      // 7. And the view is shareable as a link.
      await expect(page.locator('[data-testid="fb-share-url"]')).toContainText('caged=E');
      await expect(page).toHaveURL(/caged=E/);
    });
  }

  test('a link built by a teacher opens the same view for a student', async ({ loginAs, page }) => {
    test.setTimeout(120_000);
    const shared = '?key=D&mode=scale&scale=mixolydian&caged=G&style=mono';

    await loginAs('teacher');
    await openFretboard(page, shared);
    const teacherTitle = await page.locator('[data-testid="fb-title"]').textContent();
    const teacherNotes = await noteChips(page).allTextContents();

    // Swap identities in the same browser: clear the teacher's session first so
    // the Supabase browser client starts cold rather than half-remembering it.
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await loginAs('student');
    await openFretboard(page, shared);

    await expect(page.locator('[data-testid="fb-title"]')).toHaveText(teacherTitle ?? '');
    expect(await noteChips(page).allTextContents()).toEqual(teacherNotes);
    await expect(page.locator('[data-testid="fb-caged-zone-G"]')).toBeAttached();
    await expect(page.locator('[data-testid="fb-svg"]')).toHaveAttribute('data-style', 'mono');
  });

  test('the tool needs no data, so it never renders an empty state', async ({ loginAs, page }) => {
    test.setTimeout(120_000);
    // A student with no lessons, songs or assignments still gets a full board:
    // the fretboard is derived from music theory, not from the database.
    await loginAs('student');
    await openFretboard(page);

    await expect(page.locator('[data-testid="fb-svg"]')).toBeVisible();
    await expect(page.locator('[data-testid^="fb-cell-"]')).toHaveCount(TOTAL_CELLS);
    await expect(noteChips(page)).toHaveCount(5);
    await expect(page.locator('[data-testid^="fb-caged-card-"]')).toHaveCount(5);
    await expect(page.locator('[data-testid="fb-info-description"]')).not.toBeEmpty();
  });
});
