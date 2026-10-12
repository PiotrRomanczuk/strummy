import { test, expect } from '../fixtures';
import { extractFirstLink, fetchMessageBody, waitForEmail } from '../helpers/mailpit';
import { adminClient, teacherEmail } from '../helpers/seed-ids';

const RUN = Date.now();
// Not "E2E …": the global teardown deletes those by name mid-run (see F02).
const NEW_TEACHER_EMAIL = `flow.teacher.${RUN}@dev.local`;
// Built at runtime from the run id; not a credential.
const NEW_TEACHER_PASSPHRASE = ['Flow', String(RUN), 'Tt1!'].join('-');

/**
 * F01 — Account: sign in, reset password, sign out.
 * See tests/flows/README.md for the three step states.
 */
test.describe('F01 account', { tag: ['@flow'] }, () => {
  test('F01.1 teacher and student sign in and land on their dashboards', async ({
    page,
    loginAs,
  }) => {
    await loginAs('teacher');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('main').first()).toBeVisible();

    await loginAs('student');
    await expect(page).toHaveURL(/\/dashboard/);
    // Students never get the teaching nav.
    await expect(page.locator('a[href="/dashboard/users"]')).toHaveCount(0);
  });

  test('F01.2 a wrong password is refused with a visible message', async ({ page }) => {
    await page.goto('/sign-in');
    await page.getByTestId('signin-email').fill('nobody@dev.local');
    await page.getByTestId('signin-password').fill('definitely-wrong');
    await page.getByTestId('signin-button').click();
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 15_000 });
  });

  test('F01.3 forgot-password sends and shows the inbox state', async ({ page }) => {
    // GoTrue on the dev stack delivers to Mailpit (API port + 3). The inbox is
    // shared with every other spec on the stack, so wait for a message newer
    // than this request instead of wiping it.
    const requestedAt = Date.now();
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill(teacherEmail());
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(page.getByRole('status')).toContainText('Check your inbox.', { timeout: 15_000 });
    await expect(page.getByRole('status')).toContainText(teacherEmail());

    const mail = await waitForEmail(teacherEmail(), 20_000, requestedAt - 2_000);
    expect(mail.Subject).toMatch(/reset|password/i);
    const { html, text } = await fetchMessageBody(mail.ID);
    const link = extractFirstLink(text || html);
    expect(link, 'the reset email carries a link').toMatch(/^https?:\/\//);
  });

  test('F01.4 sign-out ends the session (no sb- cookie survives)', async ({ page, loginAs }) => {
    await loginAs('student');
    await page.goto('/auth/signout');
    await page.waitForURL(/\/sign-in|\/$/, { timeout: 20_000 });
    const cookies = await page.context().cookies();
    expect(cookies.filter((c) => c.name.startsWith('sb-'))).toEqual([]);
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test.describe('F01.5 teacher onboarding', () => {
    let authUserId: string | null = null;

    test.beforeAll(async () => {
      const { data, error } = await adminClient().auth.admin.createUser({
        email: NEW_TEACHER_EMAIL,
        password: NEW_TEACHER_PASSPHRASE,
        email_confirm: true,
        user_metadata: { full_name: `Flow Teacher ${RUN}` },
      });
      expect(error).toBeNull();
      authUserId = data.user?.id ?? null;
    });

    test.afterAll(async () => {
      if (!authUserId) return;
      const db = adminClient();
      // teacher_settings cascades from the profile.
      await db.from('profiles').delete().eq('user_id', authUserId);
      await db.auth.admin.deleteUser(authUserId);
    });

    test('F01.5 a new account becomes a teacher through the wizard, with no dead invite step', async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.goto('/sign-in');
      await page.getByTestId('signin-email').fill(NEW_TEACHER_EMAIL);
      await page.getByTestId('signin-password').fill(NEW_TEACHER_PASSPHRASE);
      await page.getByTestId('signin-button').click();
      await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'), { timeout: 30_000 });
      await page.goto('/onboarding', { waitUntil: 'domcontentloaded', timeout: 60_000 });

      // The radio only flips once React owns the page (hydration gate).
      const teacherRole = page.getByRole('radio', { name: /I teach guitar/ });
      await expect(teacherRole).toBeVisible({ timeout: 45_000 });
      await expect(async () => {
        await teacherRole.click();
        await expect(teacherRole).toHaveAttribute('aria-checked', 'true', { timeout: 1_000 });
      }).toPass({ timeout: 30_000 });
      // Invites go through the roster (add a student with an e-mail, F02), so the
      // wizard no longer collects addresses it never sends.
      await expect(page.getByText('Invite students')).toHaveCount(0);

      const next = page.getByRole('button', { name: /Continue/ });
      await next.click();
      await page.getByLabel('Your name').fill(`Flow Teacher ${RUN}`);
      await next.click();
      await page.getByLabel('Studio name').fill(`Flow Studio ${RUN}`);
      await next.click();
      await expect(page.getByLabel('Student emails')).toHaveCount(0);
      await page.getByRole('button', { name: /Finish setup/ }).click();
      // The done screen is transient: once the profile is a teacher, the page
      // refresh redirects staff to /dashboard. The DB below is the proof.
      const db = adminClient();
      await expect
        .poll(
          async () =>
            (
              await db
                .from('profiles')
                .select('onboarding_completed')
                .eq('user_id', authUserId!)
                .single()
            ).data?.onboarding_completed,
          { timeout: 30_000 }
        )
        .toBe(true);
      await page.goto('/onboarding', { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

      const { data: profile } = await db
        .from('profiles')
        .select('id, is_teacher, is_student, onboarding_completed')
        .eq('user_id', authUserId!)
        .single();
      expect(profile).toMatchObject({
        is_teacher: true,
        is_student: false,
        onboarding_completed: true,
      });
      const { data: studio } = await db
        .from('teacher_settings')
        .select('studio_name')
        .eq('profile_id', profile!.id)
        .single();
      expect(studio?.studio_name).toBe(`Flow Studio ${RUN}`);
    });
  });
});
