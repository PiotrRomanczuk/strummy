import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';

/**
 * A10.5 — settings persistence. The settings page persists the user's own
 * profile (name / phone) via updateProfileNameAction; there is no theme /
 * language / timezone setting there (theme is client-side next-themes; lang/tz
 * aren't built), so this proves the real persisted-settings journey: edit name
 * → Save → survives a reload. The original name is restored via the service-role
 * client in afterEach so the shared teacher account isn't left renamed.
 */
const ts = Date.now();
const NEW_NAME = `E2E Settings ${ts}`;
const TEACHER_EMAIL = process.env.TEST_TEACHER_EMAIL || 'teacher@dev.local';

test.describe('Settings persistence', { tag: ['@teacher', '@settings'] }, () => {
  let profileId: string | null = null;
  let originalName: string | null = null;

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
    const { data } = await adminClient()
      .from('profiles')
      .select('id, full_name')
      .eq('email', TEACHER_EMAIL)
      .single();
    profileId = data?.id ?? null;
    originalName = data?.full_name ?? null;
  });

  test.afterEach(async () => {
    if (profileId) {
      await adminClient().from('profiles').update({ full_name: originalName }).eq('id', profileId);
    }
  });

  test('edit profile name in settings → Save → persists across reload', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('/dashboard/settings');
    const nameInput = page.locator('input[name="full_name"]');
    await expect(nameInput).toBeVisible({ timeout: 15_000 });

    await nameInput.fill(NEW_NAME);
    await page.getByRole('button', { name: /Save changes/ }).click();
    await expect(page.getByText(/Saved/).first()).toBeVisible({ timeout: 10_000 });

    // Reload — the persisted name comes back from the DB, not the just-typed state.
    await page.reload();
    await expect(page.locator('input[name="full_name"]')).toHaveValue(NEW_NAME, {
      timeout: 15_000,
    });
  });
});
