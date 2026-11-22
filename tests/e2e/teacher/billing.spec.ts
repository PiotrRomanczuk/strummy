import type { Page } from '@playwright/test';

import { test, expect } from '../../fixtures';
import { adminClient, getStudentId, getTeacherId } from '../../helpers/seed-ids';

/**
 * Lesson packages end to end, on the seeded teacher and student:
 * Settings → Payments (price list, billing start), then the student page's
 * "Rozliczenia" tab (sell, record the payment, withdraw) and a lesson confirmed
 * in the calendar taking one off the balance.
 *
 * One file, serial: every test reads or writes the same teacher's billing
 * settings, so running them in parallel workers would make them race. The
 * seeded student is shared with other specs, so balances are checked relative
 * to the one found at the start.
 */
const RUN = Date.now();
const NAME = `E2E Karnet ${RUN}`;

const isoDaysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

const balanceOf = async (page: Page) =>
  Number(await page.getByTestId('student-billing-balance').getAttribute('data-balance'));

test.describe('Billing', { tag: ['@teacher'] }, () => {
  test.describe.configure({ mode: 'serial' });
  let teacherId: string;
  let studentId: string;
  let lessonId: string;
  let previousSettings: { billing_start_on: string | null; payment_term_days: number } | null;
  let startBalance: number;

  const settingsInDb = async () => {
    const { data } = await adminClient()
      .from('billing_settings')
      .select('billing_start_on, payment_term_days')
      .eq('teacher_id', teacherId)
      .maybeSingle();
    return data;
  };

  /** Save the rules form. The button stays disabled until React has hydrated the form. */
  const saveTerms = async (page: Page, startOn: string, termDays: string) => {
    await page.goto('/dashboard/settings?tab=billing');
    const terms = page.getByTestId('billing-terms');
    await expect(terms.getByRole('button')).toBeEnabled({ timeout: 15_000 });
    await terms.locator('#billing-start-on').fill(startOn);
    await terms.locator('#billing-payment-term').fill(termDays);
    await terms.getByRole('button').click();
    await expect(terms.getByRole('status')).toBeVisible({ timeout: 15_000 });
  };

  const openBillingTab = async (page: Page) => {
    await page.goto(`/dashboard/users/${studentId}`);
    await page.getByRole('tab', { name: /Rozliczenia|Billing/ }).click();
    await expect(page.getByTestId('student-billing')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('sell-package')).toBeEnabled({ timeout: 15_000 });
  };

  const sellPackage = async (page: Page) => {
    const option = page.locator('#sell-package option', { hasText: NAME });
    await page
      .locator('#sell-package')
      .selectOption((await option.getAttribute('value')) as string);
    await page.getByTestId('sell-package').click();
  };

  test.beforeAll(async () => {
    const db = adminClient();
    [teacherId, studentId] = await Promise.all([getTeacherId(db), getStudentId(db)]);
    previousSettings = await settingsInDb();
    const { data, error } = await db
      .from('lessons')
      .insert({
        teacher_id: teacherId,
        student_id: studentId,
        title: `E2E Billing ${RUN}`,
        scheduled_at: new Date(Date.now() - 10 * 60_000).toISOString(),
        status: 'SCHEDULED',
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(`seed failed: ${error?.message}`);
    lessonId = data.id as string;
  });

  test.afterAll(async () => {
    const db = adminClient();
    // Purchases take their ledger credits with them (on delete cascade); the lesson takes its −1.
    // By description, not package: a deleted package leaves its sales behind with no link.
    await db.from('package_purchases').delete().like('description', `${NAME}%`);
    await db.from('lesson_packages').delete().like('name', `${NAME}%`);
    await db.from('notification_log').delete().eq('entity_id', lessonId);
    await db.from('in_app_notifications').delete().eq('entity_id', lessonId);
    await db.from('lessons').delete().eq('id', lessonId);
    if (previousSettings) {
      await db.from('billing_settings').update(previousSettings).eq('teacher_id', teacherId);
    } else {
      await db.from('billing_settings').delete().eq('teacher_id', teacherId);
    }
    await db.rpc('rebuild_lesson_credit_entries', { p_teacher_id: teacherId });
  });

  test('teacher adds a package, edits its price and switches it off', async ({
    page,
    loginAs,
  }, testInfo) => {
    await loginAs('teacher');
    await page.goto('/dashboard/settings?tab=billing');

    const addForm = page.getByTestId('package-add-form');
    await expect(addForm.getByRole('button')).toBeEnabled({ timeout: 15_000 });
    await addForm.getByLabel(/nazwa|name/i).fill(`${NAME} edit`);
    await addForm.getByLabel(/liczba lekcji|lessons/i).fill('4');
    await addForm.getByLabel(/cena|price/i).fill('480');
    await addForm.getByRole('button').click();

    const row = page.getByTestId('billing-package-row').filter({ hasText: `${NAME} edit` });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText('480');
    await page.screenshot({ path: testInfo.outputPath('01-package-added.png'), fullPage: true });

    await row.getByRole('button').first().click();
    // While editing, the name sits in an input, so the row no longer matches by text.
    const editForm = page.getByTestId('package-edit-form');
    await editForm.getByLabel(/cena|price/i).fill('500,50');
    await editForm.getByRole('button').first().click();
    await expect(row).toContainText(/500[.,]50/, { timeout: 15_000 });

    await row.getByRole('button').nth(1).click();
    await expect(row.getByText(/wyłączony|^off$/i)).toBeVisible({ timeout: 15_000 });

    const { data } = await adminClient()
      .from('lesson_packages')
      .select('teacher_id, lesson_count, price_cents, is_active')
      .eq('name', `${NAME} edit`)
      .single();
    expect(data).toEqual({
      teacher_id: teacherId,
      lesson_count: 4,
      price_cents: 50050,
      is_active: false,
    });
  });

  test('teacher sets the day lessons start to count', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await saveTerms(page, isoDaysAgo(2), '14');
    expect(await settingsInDb()).toEqual({
      billing_start_on: isoDaysAgo(2),
      payment_term_days: 14,
    });
  });

  test('teacher sells a package and records the payment', async ({ page, loginAs }, testInfo) => {
    await adminClient()
      .from('lesson_packages')
      .insert({ teacher_id: teacherId, name: NAME, lesson_count: 4, price_cents: 48000 });
    await loginAs('teacher');
    await openBillingTab(page);
    startBalance = await balanceOf(page);

    await sellPackage(page);
    const row = page.getByTestId('purchase-row').filter({ hasText: NAME });
    await expect(row.getByTestId('purchase-mark-paid')).toBeEnabled({ timeout: 15_000 });
    await page.screenshot({ path: testInfo.outputPath('02-sold.png'), fullPage: true });

    await row.getByTestId('purchase-mark-paid').click();
    await expect(row.getByTestId('purchase-mark-paid')).toHaveCount(0, { timeout: 15_000 });
    await expect.poll(() => balanceOf(page), { timeout: 15_000 }).toBe(startBalance + 4);
    await page.screenshot({ path: testInfo.outputPath('03-paid.png'), fullPage: true });

    const { data: purchases } = await adminClient()
      .from('package_purchases')
      .select('id, status, payment_method, amount_cents, package:lesson_packages!inner(name)')
      .eq('lesson_packages.name', NAME);
    expect(purchases).toHaveLength(1);
    expect(purchases?.[0]).toMatchObject({ status: 'paid', payment_method: 'transfer' });
    const { data: credits } = await adminClient()
      .from('lesson_credit_entries')
      .select('delta')
      .eq('purchase_id', purchases?.[0].id as string);
    expect(credits).toEqual([{ delta: 4 }]);
  });

  test('a lesson confirmed as held takes one off the balance', async ({
    page,
    loginAs,
  }, testInfo) => {
    await loginAs('teacher');
    await page.goto('/dashboard/calendar');
    const awaiting = page
      .getByTestId('attendance-awaiting-row')
      .filter({ has: page.locator(`a[href$="${lessonId}"]`) });
    await expect(awaiting.getByTestId('attendance-held')).toBeEnabled({ timeout: 15_000 });
    await awaiting.getByTestId('attendance-held').click();
    await expect(awaiting).toHaveCount(0, { timeout: 15_000 });

    await openBillingTab(page);
    expect(await balanceOf(page)).toBe(startBalance + 3);
    await expect(page.getByTestId('ledger-row').first()).toContainText('−1');
    await page.screenshot({ path: testInfo.outputPath('04-lesson-held.png'), fullPage: true });

    const { data } = await adminClient()
      .from('lesson_credit_entries')
      .select('delta, reason')
      .eq('lesson_id', lessonId);
    expect(data).toEqual([{ delta: -1, reason: 'lesson' }]);
  });

  test('an unpaid package can be withdrawn and changes nothing', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await openBillingTab(page);
    const before = await balanceOf(page);

    await sellPackage(page);
    const pending = page
      .getByTestId('purchase-row')
      .filter({ hasText: NAME })
      .filter({ has: page.getByTestId('purchase-cancel') });
    await expect(pending.getByTestId('purchase-cancel')).toBeEnabled({ timeout: 15_000 });
    await pending.getByTestId('purchase-cancel').click();
    await expect(pending).toHaveCount(0, { timeout: 15_000 });
    expect(await balanceOf(page)).toBe(before);
  });

  test('the student sees the balance and the package to pay', async ({
    page,
    loginAs,
  }, testInfo) => {
    // The teacher issues one more package and leaves it unpaid.
    await loginAs('teacher');
    await openBillingTab(page);
    await sellPackage(page);
    const pending = page
      .getByTestId('purchase-row')
      .filter({ hasText: NAME })
      .filter({ has: page.getByTestId('purchase-cancel') });
    await expect(pending).toHaveCount(1, { timeout: 15_000 });
    const balance = await balanceOf(page);

    await page.context().clearCookies();
    await loginAs('student');
    await page.goto('/dashboard');
    await expect(page.getByTestId('billing-home-card')).toBeVisible({ timeout: 15_000 });
    expect(await balanceOf(page)).toBe(balance);

    await page.goto('/dashboard/billing');
    await expect(page.getByTestId('family-billing')).toBeVisible({ timeout: 15_000 });
    expect(await balanceOf(page)).toBe(balance);
    const open = page.getByTestId('family-open-purchase').filter({ hasText: NAME });
    await expect(open).toHaveCount(1);
    // No inFakt invoice yet, so no pay link — the student is told how to pay instead.
    await expect(open.getByRole('link')).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath('05-student-billing.png'), fullPage: true });
  });

  test("the parent sees the child's balance and the package to pay", async ({
    page,
    loginAs,
  }, testInfo) => {
    // parent@dev.local is linked to the seeded student (profiles.parent_id); the
    // unpaid package from the previous test is still open.
    const { balance } = await adminClient()
      .from('lesson_credit_entries')
      .select('delta')
      .eq('student_id', studentId)
      .then(({ data }) => ({ balance: (data ?? []).reduce((sum, row) => sum + row.delta, 0) }));

    await loginAs('parent');
    await page.goto('/dashboard');
    const card = page.getByTestId('billing-home-card');
    await expect(card).toBeVisible({ timeout: 15_000 });
    expect(await balanceOf(page)).toBe(balance);

    await card.getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(`/dashboard/billing\\?child=${studentId}`));
    await expect(page.getByTestId('family-billing')).toBeVisible({ timeout: 15_000 });
    expect(await balanceOf(page)).toBe(balance);
    await expect(page.getByTestId('family-open-purchase').filter({ hasText: NAME })).toHaveCount(1);
    await page.screenshot({ path: testInfo.outputPath('08-parent-billing.png'), fullPage: true });
  });

  test('a teacher opening the family billing page lands on the student list', async ({
    page,
    loginAs,
  }) => {
    await loginAs('teacher');
    await page.goto('/dashboard/billing');
    await expect(page).toHaveURL(/\/dashboard\/users$/, { timeout: 15_000 });
  });

  test('a student has no payments tab', async ({ page, loginAs }) => {
    await loginAs('student');
    await page.goto('/dashboard/settings?tab=billing');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('billing-packages')).toHaveCount(0);
    await expect(page.locator('a[href="/dashboard/settings?tab=billing"]')).toHaveCount(0);
  });
});
