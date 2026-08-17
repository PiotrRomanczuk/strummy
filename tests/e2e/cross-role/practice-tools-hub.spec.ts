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

  // There is deliberately NO Polish case here, and it is worth saying why so
  // nobody "fixes" the omission by re-adding a broken one.
  //
  // The obvious version — set the NEXT_LOCALE cookie, sign in, assert Polish —
  // cannot work on a `/dashboard/*` route. `proxy.ts` resolves locale as
  // `profiles.locale` > cookie > Accept-Language > default (the
  // `if (isAppLocale(profile?.locale)) resolvedLocale = profile.locale` branch),
  // and every seeded dev account has `profiles.locale = 'en'`, so the cookie is
  // overridden. That version was written, passed locally, and failed on CI run
  // 31896924565.
  //
  // Forcing it by writing `profiles.locale = 'pl'` WOULD work — and would break
  // every other spec asserting English against the same shared account while it
  // ran, since spec files run in parallel. Same class of bug as the deleted-rows
  // race that this suite already paid for once.
  //
  // What guards the translations instead:
  //   - `__tests__/architecture/locale-parity.test.ts` fails if any key this page
  //     uses goes missing from pl.json — the real risk, since in next-intl a
  //     missing key throws at render.
  //   - the hardcoded-English risk belongs to structure check C22, which scans
  //     `components/` but not `app/`. That gap is why this page shipped
  //     untranslated at all; closing it is its own change.
});
