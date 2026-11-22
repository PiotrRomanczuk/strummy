import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';

/**
 * Someone who learns guitar and is also a parent of another student: their
 * dashboard opens as a student, and the role switcher takes them to the family
 * dashboard (#1095). A throwaway account, so the shared role accounts keep
 * their single role.
 */
const RUN = Date.now();
// Not "E2E …": the global teardown deletes profiles whose full_name starts with E2E.
const EMAIL = `e2e.dual.${RUN}@dev.local`;
// Built at runtime from the run id; not a credential.
const PASSPHRASE = ['Dual', String(RUN), 'Aa1!'].join('-');
const CHILD = `Flow Dual Child ${RUN}`;

test.describe('Student who is also a parent', { tag: ['@parent'] }, () => {
  let authUserId: string;
  let childId: string;

  test.beforeAll(async () => {
    const db = adminClient();
    const { data: created, error } = await db.auth.admin.createUser({
      email: EMAIL,
      password: PASSPHRASE,
      email_confirm: true,
      user_metadata: { full_name: `Flow Dual ${RUN}` },
    });
    if (error || !created.user) throw new Error(`createUser failed: ${error?.message}`);
    authUserId = created.user.id;

    const { data: profile } = await db
      .from('profiles')
      .update({ is_student: true, is_parent: true, onboarding_completed: true })
      .eq('user_id', authUserId)
      .select('id')
      .single();
    const { data: child, error: childError } = await db
      .from('profiles')
      .insert({ full_name: CHILD, is_student: true, is_shadow: true, parent_id: profile!.id })
      .select('id')
      .single();
    if (childError || !child) throw new Error(`child seed failed: ${childError?.message}`);
    childId = child.id;
  });

  test.afterAll(async () => {
    const db = adminClient();
    if (childId) await db.from('profiles').delete().eq('id', childId);
    if (authUserId) {
      await db.from('profiles').delete().eq('user_id', authUserId);
      await db.auth.admin.deleteUser(authUserId);
    }
  });

  test('switches from the student dashboard to the family dashboard', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="signin-email"]').fill(EMAIL);
    await page.locator('[data-testid="signin-password"]').fill(PASSPHRASE);
    await page.locator('[data-testid="signin-button"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

    const switcher = page.getByTestId('topbar-role-switcher');
    await expect(switcher).toBeVisible({ timeout: 20_000 });
    await switcher.getByRole('link', { name: /parent|rodzic/i }).click();

    await expect(page).toHaveURL(/view=parent/);
    await expect(page.getByRole('heading', { level: 1, name: CHILD })).toBeVisible({
      timeout: 20_000,
    });
  });
});
