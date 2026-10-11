import { test, expect } from '../fixtures';
import { extractFirstLink, fetchMessageBody, waitForEmail } from '../helpers/mailpit';
import { teacherEmail } from '../helpers/seed-ids';

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
});
