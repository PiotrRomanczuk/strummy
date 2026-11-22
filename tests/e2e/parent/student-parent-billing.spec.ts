import { test, expect } from '../../fixtures';
import { adminClient, getTeacherId } from '../../helpers/seed-ids';

/**
 * A student who is also a parent: /dashboard/billing opens on their own billing
 * and switches to the child's (#1095). Throwaway account and child.
 */
const RUN = Date.now();
const EMAIL = `e2e.dualbill.${RUN}@dev.local`;
// Built at runtime from the run id; not a credential.
const PASSPHRASE = ['DualBill', String(RUN), 'Aa1!'].join('-');
const CHILD = `Flow Dual Bill Child ${RUN}`;
const PACKAGE = `Flow Karnet ${RUN}`;

test.describe('Billing for a student who is also a parent', { tag: ['@parent'] }, () => {
  let authUserId: string;
  let childId: string;

  test.beforeAll(async () => {
    const db = adminClient();
    const { data: created, error } = await db.auth.admin.createUser({
      email: EMAIL,
      password: PASSPHRASE,
      email_confirm: true,
      user_metadata: { full_name: `Flow Dual Bill ${RUN}` },
    });
    if (error || !created.user) throw new Error(`createUser failed: ${error?.message}`);
    authUserId = created.user.id;
    const { data: profile } = await db
      .from('profiles')
      .update({ is_student: true, is_parent: true, onboarding_completed: true })
      .eq('user_id', authUserId)
      .select('id')
      .single();
    const { data: child } = await db
      .from('profiles')
      .insert({ full_name: CHILD, is_student: true, is_shadow: true, parent_id: profile!.id })
      .select('id')
      .single();
    childId = child!.id;
    const { error: saleError } = await db.from('package_purchases').insert({
      teacher_id: await getTeacherId(db),
      student_id: childId,
      payer_id: childId,
      description: PACKAGE,
      lesson_count: 4,
      amount_cents: 48000,
      invoice_status: 'skipped',
    });
    if (saleError) throw new Error(`purchase seed failed: ${saleError.message}`);
  });

  test.afterAll(async () => {
    const db = adminClient();
    await db.from('package_purchases').delete().eq('description', PACKAGE);
    if (childId) await db.from('profiles').delete().eq('id', childId);
    if (authUserId) {
      await db.from('profiles').delete().eq('user_id', authUserId);
      await db.auth.admin.deleteUser(authUserId);
    }
  });

  test("opens on their own billing and switches to the child's", async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-testid="signin-email"]').fill(EMAIL);
    await page.locator('[data-testid="signin-password"]').fill(PASSPHRASE);
    await page.locator('[data-testid="signin-button"]').click();
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });

    await page.goto('/dashboard/billing');
    const tabs = page.getByRole('navigation', { name: /choose a child|wybór dziecka/i });
    await expect(tabs.getByRole('link', { name: /^(me|ja)$/i })).toHaveAttribute(
      'aria-current',
      'page'
    );
    // Their own billing is empty: nothing of the child's shows here.
    await expect(page.getByTestId('family-open-purchase')).toHaveCount(0);

    await tabs.getByRole('link', { name: CHILD }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText(CHILD);
    await expect(page.getByTestId('family-open-purchase').filter({ hasText: PACKAGE })).toHaveCount(
      1
    );
  });
});
