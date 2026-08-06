/**
 * Onboarding: Complete User Flow
 *
 * Exercises the real wizard (components/onboarding/*): role selection ->
 * (student) a single combined "guitar journey" step -> done. The previous
 * version of this file was written against an imagined 3-screen wizard
 * ("Learning Goals" / "Skill Level" / "Preferences" with a "Complete Setup"
 * button) that has never matched the actual component — 18 of its 20 tests
 * were `test.skip`, and every un-skipped one would still have failed on
 * selectors that don't exist (see onboarding.constants.ts: STUDENT_STEPS is
 * role -> journey -> done; the real buttons say "Continue ->"/"Finish setup
 * ->", not "Next"/"Complete Setup").
 *
 * "Requires a fresh user account that hasn't completed onboarding" was the
 * other blocker — every other role in the suite is a long-lived, already-
 * onboarded seed account. Each test here creates a brand-new auth user via
 * the admin API (mirroring auth/shadow-claim-with-data.spec.ts), signs in
 * as them for real, and deletes the account afterward.
 *
 * @see components/onboarding/Onboarding.tsx
 * @see components/onboarding/useOnboarding.ts
 * @see components/onboarding/onboarding.constants.ts
 */
import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';

let freshEmail: string;
let freshAuthId: string | null = null;

async function createFreshUser(firstName: string) {
  const db = adminClient();
  freshEmail = `e2e-onboarding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@dev.local`;
  const { data, error } = await db.auth.admin.createUser({
    email: freshEmail,
    password: 'test123_fresh',
    email_confirm: true,
    user_metadata: { first_name: firstName },
  });
  if (error || !data.user) throw new Error(`createFreshUser: ${error?.message}`);
  freshAuthId = data.user.id;

  // handle_new_user creates the bare profile asynchronously via trigger.
  let profileId: string | null = null;
  for (let i = 0; i < 10; i++) {
    const { data: p } = await db
      .from('profiles')
      .select('id')
      .eq('user_id', freshAuthId)
      .maybeSingle();
    if (p) {
      profileId = p.id;
      break;
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  if (!profileId) throw new Error('createFreshUser: profile row never appeared');

  // NOT is_development: true — that flag exists solely to block mutations
  // (guardTestAccountMutation) and show the demo banner (isDevelopment in
  // NavigationShell). This test's entire point is completing onboarding, a
  // real mutation (saveOnboarding), so marking the account is_development
  // makes the guard reject the "Finish setup" action it's asserting succeeds.
  return { profileId };
}

async function deleteFreshUser() {
  if (!freshAuthId) return;
  const db = adminClient();
  await db.auth.admin.deleteUser(freshAuthId);
  freshAuthId = null;
}

test.describe(
  'Onboarding: Complete User Flow',
  { tag: ['@onboarding', '@auth', '@student'] },
  () => {
    test.describe('Access Control', () => {
      test('should redirect to sign-in when not authenticated', async ({ page }) => {
        await page.context().clearCookies();
        await page.goto('/onboarding');
        await expect(page).toHaveURL(/\/sign-in/, { timeout: 10000 });
      });

      test('should redirect to dashboard if already onboarded', async ({ page, loginAs }) => {
        await loginAs('student');
        await page.goto('/onboarding');
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      });
    });

    test.describe('Student Path (fresh account)', () => {
      test.afterEach(async () => {
        await deleteFreshUser();
      });

      async function signInFresh(page: import('@playwright/test').Page, firstName: string) {
        await createFreshUser(firstName);
        await page.goto('/sign-in', { waitUntil: 'networkidle' });
        await page.locator('[data-testid="signin-email"]').fill(freshEmail);
        await page.locator('[data-testid="signin-password"]').fill('test123_fresh');
        await Promise.all([
          page.waitForURL(/\/onboarding/, { timeout: 15000 }),
          page.locator('[data-testid="signin-button"]').click(),
        ]);

        // The peripheral-page shell (NavigationShell) lazy-loads its desktop
        // variant behind Suspense; in dev this settles with a brief extra
        // remount shortly after first paint. Interacting before it settles
        // loses the wizard's in-memory state (aria-pressed resets, step
        // snaps back to 1) with no navigation or error — wait it out once,
        // up front, rather than chasing it on every subsequent click.
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);
      }

      test('role step shows both options and blocks Continue until one is picked', async ({
        page,
      }) => {
        await signInFresh(page, 'Robin');

        await expect(
          page.getByRole('heading', { name: 'What brings you to Strummy?' })
        ).toBeVisible();
        const studentTile = page.getByRole('button', { name: /I want to learn/ });
        const teacherTile = page.getByRole('button', { name: /I teach guitar/ });
        await expect(studentTile).toBeVisible();
        await expect(teacherTile).toBeVisible();

        const continueBtn = page.getByRole('button', { name: /Continue/ });
        await expect(continueBtn).toBeDisabled();

        await studentTile.click();
        await expect(studentTile).toHaveAttribute('aria-pressed', 'true');
        await expect(continueBtn).toBeEnabled();
      });

      test('selecting student advances to the guitar journey step, gated on a goal', async ({
        page,
      }) => {
        await signInFresh(page, 'Robin');
        await page.getByRole('button', { name: /I want to learn/ }).click();
        await page.getByRole('button', { name: /Continue/ }).click();

        await expect(
          page.getByRole('heading', { name: 'Where are you with guitar?' })
        ).toBeVisible();
        await expect(page.getByText('Pick at least one goal to continue.')).toBeVisible();
        await expect(page.getByRole('button', { name: /Finish setup/ })).toBeDisabled();
      });

      test('picking a level, a goal, a guitar, and a practice target enables Finish setup and shows a live summary', async ({
        page,
      }) => {
        await signInFresh(page, 'Robin');
        await page.getByRole('button', { name: /I want to learn/ }).click();
        await page.getByRole('button', { name: /Continue/ }).click();

        await page.getByRole('button', { name: /A few months in/ }).click();
        const goalChip = page.getByRole('button', { name: 'Understand theory' });
        await goalChip.click();
        await expect(goalChip).toHaveAttribute('aria-pressed', 'true');

        await expect(page.getByText('Based on your answers')).toBeVisible();

        await page
          .getByTestId('student-guitars')
          .getByRole('button', { name: 'Acoustic (steel-string)' })
          .click();
        await page.getByRole('button', { name: '15 min/day' }).click();

        await expect(page.getByRole('button', { name: /Finish setup/ })).toBeEnabled();

        // Deselecting the goal should re-disable it — proves the gate is live,
        // not just checked once on step entry.
        await goalChip.click();
        await expect(goalChip).toHaveAttribute('aria-pressed', 'false');
        await expect(page.getByRole('button', { name: /Finish setup/ })).toBeDisabled();
      });

      test('completing the journey persists the profile as a student and lands on the Done screen', async ({
        page,
      }) => {
        await signInFresh(page, 'Robin');
        const db = adminClient();
        const { data: profileRow } = await db
          .from('profiles')
          .select('id')
          .eq('user_id', freshAuthId!)
          .single();
        const profileId = profileRow!.id;

        await page.getByRole('button', { name: /I want to learn/ }).click();
        await page.getByRole('button', { name: /Continue/ }).click();
        await page.getByRole('button', { name: /Confident/ }).click();
        await page.getByRole('button', { name: 'Write my own songs' }).click();
        await page.getByTestId('student-guitars').getByRole('button', { name: 'Electric' }).click();
        await page.getByRole('button', { name: '30 min/day' }).click();

        await page.getByRole('button', { name: /Finish setup/ }).click();

        // A completed Server Action refreshes the current route, so the
        // re-evaluated /onboarding server component (is_student now true)
        // can redirect straight to /dashboard before the client ever
        // renders the Done step. Assert the Done copy only when the race
        // lands in its favor — the persisted data below is the real contract.
        const doneHeading = page.getByRole('heading', { name: "You're all set, Robin." });
        await Promise.race([
          doneHeading.waitFor({ timeout: 15000 }),
          page.waitForURL(/\/dashboard/, { timeout: 15000 }),
        ]);
        if (await doneHeading.isVisible()) {
          await expect(
            page.getByText('Your first lesson plan is waiting on your dashboard.')
          ).toBeVisible();
          await expect(page.getByRole('link', { name: /Go to dashboard/ })).toBeVisible();
        }

        const { data: profile } = await db
          .from('profiles')
          .select('is_student, is_teacher')
          .eq('id', profileId)
          .single();
        expect(profile?.is_student).toBe(true);
        expect(profile?.is_teacher).toBe(false);

        const { data: prefs } = await db
          .from('user_preferences')
          .select('goals, daily_goal_minutes, instrument_preference')
          .eq('profile_id', profileId)
          .single();
        expect(prefs?.goals).toContain('songwriting');
        expect(prefs?.daily_goal_minutes).toBe(30);
        expect(prefs?.instrument_preference).toContain('electric');
      });

      test('visiting /onboarding again after completion redirects to the dashboard', async ({
        page,
      }) => {
        await signInFresh(page, 'Robin');
        await page.getByRole('button', { name: /I want to learn/ }).click();
        await page.getByRole('button', { name: /Continue/ }).click();
        await page.getByRole('button', { name: 'New to guitar' }).click();
        await page.getByRole('button', { name: 'Jam with friends' }).click();
        await page.getByRole('button', { name: /Finish setup/ }).click();
        // A completed Server Action refreshes the current route, so the
        // re-evaluated /onboarding server component (is_student now true)
        // can redirect straight to /dashboard before the client ever
        // renders the Done step — landing on either is a valid completion.
        await Promise.race([
          page.getByRole('link', { name: /Go to dashboard/ }).waitFor({ timeout: 15000 }),
          page.waitForURL(/\/dashboard/, { timeout: 15000 }),
        ]);

        await page.goto('/onboarding');
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
      });

      test('Back returns to the role step with the previous selection preserved', async ({
        page,
      }) => {
        await signInFresh(page, 'Robin');
        await page.getByRole('button', { name: /I want to learn/ }).click();
        await page.getByRole('button', { name: /Continue/ }).click();
        await expect(
          page.getByRole('heading', { name: 'Where are you with guitar?' })
        ).toBeVisible();

        await page.getByRole('button', { name: '← Back' }).click();
        await expect(
          page.getByRole('heading', { name: 'What brings you to Strummy?' })
        ).toBeVisible();
        await expect(page.getByRole('button', { name: /I want to learn/ })).toHaveAttribute(
          'aria-pressed',
          'true'
        );
      });

      test('the role step is usable at mobile viewport', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await signInFresh(page, 'Robin');

        await expect(
          page.getByRole('heading', { name: 'What brings you to Strummy?' })
        ).toBeVisible();
        const studentTile = page.getByRole('button', { name: /I want to learn/ });
        await expect(studentTile).toBeVisible();
        const box = await studentTile.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(40);

        const viewportWidth = page.viewportSize()?.width ?? 375;
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
      });
    });
  }
);
