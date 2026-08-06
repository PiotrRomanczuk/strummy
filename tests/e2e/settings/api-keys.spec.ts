import { test, expect } from '../../fixtures';

/**
 * API Keys E2E Tests (A10.3 / B8.3)
 *
 * Journeys tested:
 *  A10.3 — Admin creates a gcrm_ API key → visible in table → delete
 *  B8.3  — A student is neither offered the section nor allowed by the route
 *
 * UI: inline form (no dialog), "Create API Key" submit button.
 * Deletion uses browser confirm() — handled via page.once('dialog').
 * Success/error messages are inline (not toasts).
 */

test.describe.configure({ mode: 'serial' });

test.describe('API Keys', { tag: ['@settings', '@api-keys'] }, () => {
  test('A10.3 create an API key, see it in the table, then delete it', async ({
    page,
    loginAs,
  }) => {
    test.setTimeout(60_000);
    await loginAs('admin');

    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // "Create New API Key" section heading
    await expect(page.locator('text=/Create New API Key/i').first()).toBeVisible({
      timeout: 15_000,
    });

    const keyName = `E2E Test Key ${Date.now()}`;

    // Fill the inline form and submit
    await page.locator('#name').fill(keyName);
    await page.getByRole('button', { name: 'Create API Key' }).click();

    // After creation: "API Key Created" section appears with a <code> element
    await expect(page.locator('text=/API Key Created/i').first()).toBeVisible({ timeout: 15_000 });
    const keyCode = page.locator('code').first();
    await expect(keyCode).toBeVisible({ timeout: 10_000 });
    const keyValue = (await keyCode.textContent()) ?? '';
    expect(keyValue).toMatch(/^gcrm_/);

    // Close the new-key panel
    await page.getByRole('button', { name: 'Close' }).click();

    // Key name appears in the table
    await expect(page.locator(`text=${keyName}`).first()).toBeVisible({ timeout: 10_000 });

    // Delete — accept the native browser confirm() dialog
    const keyRow = page.locator('tr', { hasText: keyName });
    page.once('dialog', (dialog) => dialog.accept());
    await keyRow.getByRole('button', { name: 'Delete' }).click();

    // Inline success message
    await expect(page.locator('text=/API key deleted successfully/i').first()).toBeVisible({
      timeout: 10_000,
    });

    // Key no longer in the table
    await expect(page.locator(`text=${keyName}`)).not.toBeVisible({ timeout: 8_000 });
  });

  test('A10.4 API Keys table columns are sortable', async ({ page, loginAs }) => {
    test.setTimeout(60_000);
    await loginAs('admin');

    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    const suffix = Date.now();
    const names = [`Zebra Sort ${suffix}`, `Alpha Sort ${suffix}`];
    try {
      for (const name of names) {
        await page.locator('#name').fill(name);
        await page.getByRole('button', { name: 'Create API Key' }).click();
        await expect(page.locator('text=/API Key Created/i').first()).toBeVisible({
          timeout: 15_000,
        });
        await page.getByRole('button', { name: 'Close' }).click();
      }

      const nameHeader = page.getByRole('button', { name: /sort by name/i });
      await expect(nameHeader).toBeVisible({ timeout: 10_000 });

      await nameHeader.click();
      const rowsAsc = page.locator('tbody tr').filter({ hasText: `Sort ${suffix}` });
      await expect(rowsAsc.first()).toContainText(`Alpha Sort ${suffix}`);

      await nameHeader.click();
      const rowsDesc = page.locator('tbody tr').filter({ hasText: `Sort ${suffix}` });
      await expect(rowsDesc.first()).toContainText(`Zebra Sort ${suffix}`);
    } finally {
      for (const name of names) {
        const keyRow = page.locator('tr', { hasText: name });
        if (await keyRow.count()) {
          page.once('dialog', (dialog) => dialog.accept());
          await keyRow.getByRole('button', { name: 'Delete' }).click();
          await expect(page.locator(`text=${name}`)).not.toBeVisible({ timeout: 8_000 });
        }
      }
    }
  });

  test('B8.3 a student is not offered API keys, and the route refuses them', async ({
    page,
    loginAs,
  }) => {
    // This test used to assert a student COULD mint a key. That was closed as a
    // security hole: app/dashboard/settings/page.tsx now gates the section on
    // `isAdmin || isTeacher` ("a student has no documented use for a long-lived
    // programmatic credential, and showing the section invites them to mint
    // one") and POST /api/api-keys enforces the same rule server-side. Asserting
    // the old behaviour would be asserting the vulnerability.
    await loginAs('student');

    await page.goto('/dashboard/settings');
    await page.waitForLoadState('networkidle');

    // The settings page itself must still render — only the section is gone.
    await expect(page.getByRole('heading', { name: /settings/i }).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('text=/Create New API Key/i')).toHaveCount(0);

    // Hiding the UI is not the control; the route is. Verify it directly.
    const response = await page.request.post('/api/api-keys', {
      headers: { 'Content-Type': 'application/json' },
      data: { name: 'student-should-not-get-this' },
    });
    expect(response.status(), 'a student must be refused server-side').toBe(403);
    expect((await response.json()).error).toMatch(/teachers and admins/i);
  });
});
