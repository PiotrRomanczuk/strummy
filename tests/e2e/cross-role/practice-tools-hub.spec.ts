import { test, expect } from '../../fixtures';
import { openNav } from '../../helpers/dashboard';

/**
 * Cross-Role Tests: the practice-tools hub (`/dashboard/skills`).
 *
 * Restyled and translated 2026-08-15 (PR "theme and translate the
 * practice-tools hub"). It had no E2E at all, which is how it kept a page of
 * hardcoded English past CI — structure check C22 scans `components/`, never
 * `app/`. The Polish case below is the regression guard for that.
 *
 * NOT the skill-assessment checklist: this route is doc 05's chord quiz, and
 * confusing the two is what shipped a mislabelled nav item (SKL-2). The
 * assessment lives in `my-skills.spec.ts` / `student-skills.spec.ts`.
 */

const ROLES = ['student', 'teacher', 'admin'] as const;

test.describe('Practice tools hub', { tag: ['@cross-role', '@skills'] }, () => {
  for (const role of ROLES) {
    test(`${role} can open the hub and reach the chord quiz`, async ({ page, loginAs }) => {
      await loginAs(role);
      await page.goto('/dashboard/skills');
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { name: 'Practice Tools' })).toBeVisible();
      await expect(page.getByText('Chord Quiz')).toBeVisible();

      await page.getByRole('link', { name: /Chord Quiz/ }).click();
      await page.waitForURL('**/dashboard/skills/chord-quiz');
    });
  }

  test('the hub is reachable from the sidebar, not only by URL', async ({ page, loginAs }) => {
    await loginAs('student');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // The nav entry reads "Practice Tools"; until SKL-2 it rendered "Skills"
    // because it shared the teacher entry's id.
    await openNav(page);
    await page.getByRole('link', { name: 'Practice Tools' }).first().click();
    await page.waitForURL('**/dashboard/skills');
    await expect(page.getByRole('heading', { name: 'Practice Tools' })).toBeVisible();
  });

  test('renders in Polish without a missing-key crash', async ({ page, context, loginAs }) => {
    // In next-intl a missing key THROWS at render — it is not a silent
    // fallback — so a locale switch is a real functional test, not cosmetics.
    // Every string on this page was hardcoded English until 2026-08-15.
    await context.addCookies([{ name: 'NEXT_LOCALE', value: 'pl', url: 'http://localhost:3000' }]);
    await loginAs('student');
    await page.goto('/dashboard/skills');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Narzędzia do ćwiczeń' })).toBeVisible();
    await expect(page.getByText('Quiz akordowy')).toBeVisible();
    // No English left behind on the page.
    await expect(page.getByText('Chord Quiz')).toHaveCount(0);
  });
});
