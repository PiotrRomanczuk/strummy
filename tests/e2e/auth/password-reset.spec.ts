/**
 * Locks `auth:password-reset-flow` (see tasks/unbreakable-core.md).
 *
 * The application boundary (no email enumeration on reset request) is already
 * locked by app/auth/__tests__/actions.test.ts. The remaining unbreakable
 * properties live in Supabase + the email roundtrip:
 *   - the reset request always returns success regardless of email validity
 *   - the link is single-use (a second click returns 410/expired)
 *   - the new password actually signs in
 *
 * The full email-link click leg requires a test inbox (Mailpit / MailHog /
 * Supabase Inbucket). Without that the test only verifies the request side;
 * the link-click + new-password-signin tests are skipped with a TODO.
 *
 * @tags @auth @password-reset
 */

import { test, expect } from '../../fixtures';

test.describe('Password reset', { tag: ['@auth', '@password-reset', '@unbreakable'] }, () => {
  test('request for an existing email returns success', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel(/email/i).fill(process.env.TEST_TEACHER_EMAIL || 'teacher@example.com');
    await page.getByRole('button', { name: /reset|send/i }).click();
    await expect(page.getByText(/check your email|reset link sent|if an account/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('request for a non-existent email returns the same success message (no enumeration)', async ({
    page,
  }) => {
    await page.goto('/forgot-password');
    await page.getByLabel(/email/i).fill('definitely-does-not-exist-12345@example.com');
    await page.getByRole('button', { name: /reset|send/i }).click();
    await expect(page.getByText(/check your email|reset link sent|if an account/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test.skip('reset link is single-use (TODO: needs test inbox)', async () => {
    // 1. trigger reset for teacher@example.com
    // 2. fetch the email from Mailpit / Inbucket
    // 3. extract the recovery URL, navigate to it, set a new password
    // 4. navigate to it AGAIN, expect 410 / "link expired"
  });

  test.skip('signing in with the new password works (TODO: needs test inbox)', async () => {
    // 1. trigger reset, click the link, set a new password
    // 2. sign out
    // 3. sign in with the new password, expect /dashboard
    // 4. cleanup: reset password back to the seed value
  });
});
