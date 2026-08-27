import { test, expect } from '../../fixtures';
import { suppressDemoTour } from '../../helpers/demo-tour';

/**
 * The demo studio has to look like a working studio.
 *
 * `demo-mutation-guards.spec.ts` proves the pages render and refuse writes;
 * `demo-screenshots.spec.ts` captures them. Neither asserts that anything is
 * actually IN there — and an empty demo is the specific failure this account
 * exists to avoid. On 2026-08-26 production had five demo accounts with no
 * `profiles` rows at all, so every one of them landed in the onboarding wizard
 * instead of a studio, and no spec noticed.
 *
 * These tests therefore assert seeded content by name: the students the
 * teacher should see, the repertoire, and the student's own side of it.
 */

const STUDENT_NAMES = ['Zofia', 'Jakub', 'Maja', 'Piotr'];

test.describe('Demo studio content', { tag: ['@demo'] }, () => {
  test('the teacher sees their four students', async ({ page, loginAs }) => {
    test.setTimeout(120_000);
    await suppressDemoTour(page);
    await loginAs('demo');

    await page.goto('/dashboard/users');
    await page.waitForLoadState('networkidle');

    for (const name of STUDENT_NAMES) {
      await expect(page.getByText(name, { exact: false }).first()).toBeVisible({
        timeout: 15_000,
      });
    }
  });

  test('the lessons list is populated, not an empty state', async ({ page, loginAs }) => {
    test.setTimeout(120_000);
    await suppressDemoTour(page);
    await loginAs('demo');

    await page.goto('/dashboard/lessons');
    await page.waitForLoadState('networkidle');

    // Anchored on the lesson row itself, not the student name: the phone
    // layout leads with "#<number> <title>" and drops the name for space, so
    // an earlier version of this assertion failed on every phone project
    // against a list that was rendering perfectly.
    await expect(page.getByRole('link', { name: /#\d+\s+\S/ }).first()).toBeVisible({
      timeout: 20_000,
    });

    // And the empty state must NOT be what we are looking at.
    await expect(page.getByText(/no lessons|brak lekcji/i)).toHaveCount(0);
  });

  test('assignments carry the seeded work', async ({ page, loginAs }) => {
    test.setTimeout(120_000);
    await suppressDemoTour(page);
    await loginAs('demo');

    await page.goto('/dashboard/assignments');
    await page.waitForLoadState('networkidle');

    // Titles come straight from the seed's assignment list.
    await expect(page.getByText(/Wonderwall|Blackbird|Hotel California/i).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test('the songs catalogue is reachable and populated', async ({ page, loginAs }) => {
    test.setTimeout(120_000);
    await suppressDemoTour(page);
    await loginAs('demo');

    await page.goto('/dashboard/songs');
    await page.waitForLoadState('networkidle');

    // Deliberately NOT asserting a specific title here. `songs` is one shared
    // catalogue — 501 rows on production, 1474 on dev — so any given song sits
    // on an arbitrary page, and an earlier version of this test failed purely
    // because "Wonderwall" was on page 7. The demo's own repertoire is asserted
    // in the next test, where it is actually scoped to these students.
    await expect(page.getByText(/\d+ songs/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/page \d+ of \d+/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test('the demo student sees their own repertoire and assignments', async ({ page, loginAs }) => {
    test.setTimeout(120_000);
    await suppressDemoTour(page);
    await loginAs('demoStudent');

    // `/dashboard/repertoire` is the signed-in user's OWN repertoire — empty
    // for a teacher by design, which is why this assertion belongs on the
    // student side of the same studio.
    await page.goto('/dashboard/repertoire');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Wonderwall|Blackbird|Brown Eyed Girl/i).first()).toBeVisible({
      timeout: 20_000,
    });

    await page.goto('/dashboard/assignments');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Wonderwall|Blackbird/i).first()).toBeVisible({ timeout: 20_000 });
  });

  test('the demo banner offers the interest form', async ({ page, loginAs }) => {
    test.setTimeout(120_000);
    await suppressDemoTour(page);
    await loginAs('demo');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // The banner is dismissible and remembers that in localStorage, so a
    // previous spec in the same storage state may have hidden it. Assert the
    // link only when the banner is actually on screen.
    const banner = page.getByTestId('demo-banner-interest');
    if ((await banner.count()) > 0) {
      await expect(banner).toHaveAttribute('href', '/for-teachers');
    } else {
      test.info().annotations.push({ type: 'note', description: 'banner dismissed in this state' });
    }
  });
});
