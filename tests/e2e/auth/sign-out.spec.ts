import { test, expect } from '../../fixtures';

/**
 * Sign-out E2E Tests (A1.2)
 *
 * Journeys tested:
 *  A1.2 — Sign out from topbar user menu → redirected to /sign-in, session cleared
 */

test.describe('Sign-out', { tag: ['@auth', '@sign-out'] }, () => {
  test('A1.2 admin signs out via topbar and lands on sign-in', async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Open topbar user menu, and wait for it to actually be open before
    // reaching into it — see the note on the student case below.
    await page.click('[data-testid="topbar-user-menu-trigger"]');
    await expect(page.getByTestId('topbar-signout')).toBeVisible();
    await page.click('[data-testid="topbar-signout"]');

    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });
    // Dashboard is no longer accessible without re-login
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });
  });

  test('A1.2 student signs out via topbar and lands on sign-in', async ({ page, loginAs }) => {
    await loginAs('student');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Gate the second click on the menu being open. Radix mounts the item and
    // scales the content in, and while that is in flight the modal dropdown
    // holds `pointer-events: none` on <body> — so a press aimed at the item
    // resolves to the document root instead. That is precisely what this test
    // did on iPad Pro in the 2026-08-28 nightly: "element is not stable", then
    // fifteen seconds of `<html> intercepts pointer events`.
    //
    // `topbar.spec.ts` opens the same menu and asserts the item is visible
    // before touching it, and passes on every project; this spec was the one
    // clicking straight through. Same two clicks, same assertions after.
    await page.click('[data-testid="topbar-user-menu-trigger"]');
    await expect(page.getByTestId('topbar-signout')).toBeVisible();
    await page.click('[data-testid="topbar-signout"]');

    await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });
    // Landing on /sign-in is NOT proof of sign-out — the session lives in an
    // `sb-*` cookie, and a redirect can win the race against middleware while
    // the cookie survives. That exact false-green hid a real bug: browser-side
    // signOut() cleared localStorage only, so the next person on a shared
    // machine was still signed in. Assert the session is genuinely dead.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });

    const authCookies = (await page.context().cookies()).filter((c) => c.name.startsWith('sb-'));
    expect(authCookies).toEqual([]);
  });
});
