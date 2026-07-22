import { test, expect } from '../../fixtures';
import { adminClient, getAdminId } from '../../helpers/seed-ids';

/**
 * Settings — Integrations Section (docs/app-blueprint/93-design-mockup-audit.md,
 * "Strummy - Settings Integrations.html" row)
 *
 * Previously `IntegrationsSection` was only exercised indirectly via
 * `teacher/calendar-conflicts.spec.ts` (same component, mounted on
 * `/dashboard/calendar`). These cases assert it directly from its actual
 * home, `/dashboard/settings`:
 *
 *  - the section renders on Settings itself (not just reachable via Calendar)
 *  - the connect/disconnect UI matches the real `user_integrations` row for
 *    the logged-in admin (same DB-driven branching as A8.1 in
 *    calendar-conflicts.spec.ts)
 *  - the "Connect" action navigates toward our own `/api/auth/google`
 *    redirect endpoint — the request is intercepted before it leaves our
 *    origin so the test never follows through Google's real OAuth consent
 *    screen (out of scope for E2E; there's no Google account to complete it
 *    with here).
 */

test.describe.configure({ mode: 'serial' });

test.describe('Settings Integrations', { tag: ['@settings', '@integrations'] }, () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('admin');
  });

  test('Integrations section renders on /dashboard/settings itself', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Integrations' })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText('Google Calendar', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Connect your Google Calendar to automatically sync lessons')
    ).toBeVisible();
  });

  test('connect/disconnect UI matches the real Google integration state', async ({ page }) => {
    const db = adminClient();
    const adminId = await getAdminId(db);
    const { data: integration } = await db
      .from('user_integrations')
      .select('user_id')
      .eq('user_id', adminId)
      .eq('provider', 'google')
      .maybeSingle();
    const isConnected = Boolean(integration);

    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    if (isConnected) {
      await expect(page.getByText('Connected', { exact: true })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('button', { name: 'Disconnect' })).toBeVisible();
    } else {
      await expect(page.getByText('Not connected', { exact: true })).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByRole('button', { name: 'Connect Google Calendar' })).toBeVisible();
    }
  });

  test('clicking Connect navigates toward /api/auth/google', async ({ page }) => {
    const db = adminClient();
    const adminId = await getAdminId(db);
    const { data: integration } = await db
      .from('user_integrations')
      .select('user_id')
      .eq('user_id', adminId)
      .eq('provider', 'google')
      .maybeSingle();
    test.skip(
      Boolean(integration),
      'Admin account is already connected to Google — no "Connect" button to exercise'
    );

    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    const connectButton = page.getByRole('button', { name: 'Connect Google Calendar' });
    await expect(connectButton).toBeVisible({ timeout: 10_000 });

    // Intercept our own redirect endpoint so the test asserts the app's
    // navigation intent without actually following the 302 out to Google's
    // real OAuth consent screen (never mock/fake a completed Google login).
    await page.route('**/api/auth/google', (route) =>
      route.fulfill({ status: 200, contentType: 'text/plain', body: 'stubbed-for-e2e' })
    );

    const [request] = await Promise.all([
      page.waitForRequest('**/api/auth/google'),
      connectButton.click(),
    ]);

    expect(new URL(request.url()).pathname).toBe('/api/auth/google');
  });
});
