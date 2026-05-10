/**
 * Locks `auth:signout-invalidates-session` (see tasks/unbreakable-core.md).
 *
 * Strummy has no server-side signOut action; nav components call
 * `supabase.auth.signOut()` directly. The unbreakable property is:
 * after that call, the cookie is cleared and a follow-up fetch sees no session.
 *
 * @tags @auth @sign-out
 */

import { test, expect } from '../../fixtures';

test.describe(
  'Sign-out invalidates the session',
  { tag: ['@auth', '@sign-out', '@unbreakable'] },
  () => {
    test('a protected fetch after sign-out returns 401', async ({ page, loginAs }) => {
      await loginAs('teacher');

      // Sanity: an authenticated /api/users/profile call works.
      const beforeRes = await page.request.get('/api/users/profile');
      expect(beforeRes.status()).toBe(200);

      // Sign out via Supabase SDK in the page context (mirrors what the nav
      // components do — Strummy has no server signOut action).
      await page.evaluate(async () => {
        const mod = await import('/lib/supabase-browser');
        const { getSupabaseBrowserClient } = mod;
        await getSupabaseBrowserClient().auth.signOut();
      });

      // Same browser context, follow-up call must now be unauthenticated.
      const afterRes = await page.request.get('/api/users/profile');
      expect([401, 403]).toContain(afterRes.status());
    });

    test('navigating to /dashboard after sign-out redirects to /sign-in', async ({
      page,
      loginAs,
    }) => {
      await loginAs('teacher');

      await page.evaluate(async () => {
        const mod = await import('/lib/supabase-browser');
        const { getSupabaseBrowserClient } = mod;
        await getSupabaseBrowserClient().auth.signOut();
      });

      await page.goto('/dashboard');
      await expect(page).toHaveURL(/sign-in|\/$/);
    });
  }
);
