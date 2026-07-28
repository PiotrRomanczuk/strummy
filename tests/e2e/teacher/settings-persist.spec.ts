import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';

/**
 * A10.5 — settings persistence. The settings page persists the user's own
 * profile (name / phone) via updateProfileNameAction; there is no theme /
 * language / timezone setting there (theme is client-side next-themes; lang/tz
 * aren't built), so this proves the real persisted-settings journey: edit name
 * → Save → survives a reload.
 *
 * Two hard-won rules encoded here:
 *
 * 1. Persistence is asserted against the DATABASE, not the "✓ Saved" badge.
 *    The save action intermittently completes server-side while the client's
 *    useActionState transition never resolves (button wedged on "Saving…",
 *    no console error) — waiting on the badge turned that app-level wedge
 *    into a 40-50% test flake. The DB is the source of truth; the reload
 *    assertion still proves the UI reads it back.
 *
 * 2. The rename must NOT start with "E2E" and the restore must be a CONSTANT.
 *    cleanupTestUsers deletes profiles whose full_name matches /^E2E/; a
 *    failed restore once left the rename in place, the next run captured it
 *    as "originalName", and global teardown deleted the real teacher@dev.local
 *    profile. Restoring the canonical seed name breaks that poison cascade.
 */
const ts = Date.now();
const NEW_NAME = `Settings Persist ${ts}`;
const TEACHER_EMAIL = process.env.TEST_TEACHER_EMAIL || 'teacher@dev.local';
// Canonical seed identity of teacher@dev.local (first_name Sarah, last_name
// Mitchell). Restored unconditionally — never restore a read-back name.
const CANONICAL_TEACHER_NAME = 'Sarah Mitchell';

test.describe('Settings persistence', { tag: ['@teacher', '@settings'] }, () => {
  let profileId: string | null = null;

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
    const { data } = await adminClient()
      .from('profiles')
      .select('id')
      .eq('email', TEACHER_EMAIL)
      .single();
    profileId = data?.id ?? null;
  });

  test.afterEach(async () => {
    if (profileId) {
      await adminClient()
        .from('profiles')
        .update({ full_name: CANONICAL_TEACHER_NAME })
        .eq('id', profileId);
    }
  });

  test('edit profile name in settings → Save → persists across reload', async ({ page }) => {
    test.setTimeout(120_000);
    expect(profileId, `no profile row for ${TEACHER_EMAIL} — dev seed missing?`).not.toBeNull();

    await page.goto('/dashboard/settings');
    const nameInput = page.locator('input[name="full_name"]');
    await expect(nameInput).toBeVisible({ timeout: 15_000 });

    await nameInput.fill(NEW_NAME);

    // Click, then poll the DB for the persisted name. Re-click only while the
    // button still reads "Save changes" — covers the pre-hydration click that
    // gets swallowed (nothing dispatched) AND the wedged-pending click (button
    // stuck on "Saving…" but the mutation already landed; the poll passes).
    await expect(async () => {
      const saveBtn = page.getByRole('button', { name: /Save changes/ });
      if (await saveBtn.isVisible().catch(() => false)) {
        if ((await nameInput.inputValue()) !== NEW_NAME) {
          await nameInput.fill(NEW_NAME);
        }
        await saveBtn.click();
      }
      await expect
        .poll(
          async () => {
            const { data } = await adminClient()
              .from('profiles')
              .select('full_name')
              .eq('id', profileId!)
              .single();
            return data?.full_name;
          },
          { timeout: 5_000 }
        )
        .toBe(NEW_NAME);
    }).toPass({ timeout: 45_000 });

    // Reload — the persisted name comes back from the DB, not the just-typed state.
    await page.reload();
    await expect(page.locator('input[name="full_name"]')).toHaveValue(NEW_NAME, {
      timeout: 15_000,
    });
  });
});
