import { test, expect } from '../../fixtures';
import { adminClient, getStudentId, getTeacherId } from '../../helpers/seed-ids';

/**
 * Settings → Payments: the teacher keeps a price list and decides from which
 * day held lessons count. A student has no such tab. The spec checks the
 * database, because these rows are what a sold package will be priced from.
 */
const RUN = Date.now();
const NAME = `E2E Karnet ${RUN}`;

test.describe('Billing settings', { tag: ['@teacher'] }, () => {
  test.describe.configure({ mode: 'serial' });
  let teacherId: string;
  let previousStart: string | null | undefined;
  let lessonId: string | undefined;

  test.beforeAll(async () => {
    const db = adminClient();
    teacherId = await getTeacherId(db);
    const { data } = await db
      .from('billing_settings')
      .select('billing_start_on')
      .eq('teacher_id', teacherId)
      .maybeSingle();
    previousStart = data ? data.billing_start_on : undefined;
  });

  test.afterAll(async () => {
    const db = adminClient();
    if (lessonId) {
      await db.from('notification_log').delete().eq('entity_id', lessonId);
      await db.from('in_app_notifications').delete().eq('entity_id', lessonId);
      await db.from('lessons').delete().eq('id', lessonId);
    }
    await db.from('lesson_packages').delete().like('name', `${NAME}%`);
    if (previousStart === undefined) {
      await db.from('billing_settings').delete().eq('teacher_id', teacherId);
    } else {
      await db
        .from('billing_settings')
        .update({ billing_start_on: previousStart })
        .eq('teacher_id', teacherId);
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
    await expect(addForm).toBeVisible({ timeout: 15_000 });
    await addForm.getByLabel(/nazwa|name/i).fill(NAME);
    await addForm.getByLabel(/liczba lekcji|lessons/i).fill('4');
    await addForm.getByLabel(/cena|price/i).fill('480');
    await addForm.getByRole('button').click();

    const row = page.getByTestId('billing-package-row').filter({ hasText: NAME });
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
    await page.screenshot({ path: testInfo.outputPath('02-package-off.png'), fullPage: true });

    const { data } = await adminClient()
      .from('lesson_packages')
      .select('teacher_id, lesson_count, price_cents, is_active')
      .eq('name', NAME)
      .single();
    expect(data).toEqual({
      teacher_id: teacherId,
      lesson_count: 4,
      price_cents: 50050,
      is_active: false,
    });
  });

  test('teacher sets the day lessons start to count', async ({ page, loginAs }, testInfo) => {
    await loginAs('teacher');
    await page.goto('/dashboard/settings?tab=billing');

    const terms = page.getByTestId('billing-terms');
    await expect(terms).toBeVisible({ timeout: 15_000 });
    // A value typed before hydration is thrown away when React takes the input over.
    await expect(async () => {
      await terms.locator('#billing-start-on').fill('2099-01-01');
      await terms.locator('#billing-payment-term').fill('14');
      await page.waitForTimeout(300);
      await expect(terms.locator('#billing-start-on')).toHaveValue('2099-01-01');
    }).toPass({ timeout: 15_000 });
    await terms.getByRole('button').click();
    await expect(terms.getByRole('status')).toBeVisible({ timeout: 15_000 });
    await page.screenshot({ path: testInfo.outputPath('03-terms-saved.png'), fullPage: true });

    const { data } = await adminClient()
      .from('billing_settings')
      .select('billing_start_on, payment_term_days')
      .eq('teacher_id', teacherId)
      .single();
    expect(data).toEqual({ billing_start_on: '2099-01-01', payment_term_days: 14 });
  });

  test('a lesson confirmed as held takes one off the balance', async ({ page, loginAs }) => {
    const db = adminClient();
    const studentId = await getStudentId(db);
    const { data: lesson, error } = await db
      .from('lessons')
      .insert({
        teacher_id: teacherId,
        student_id: studentId,
        title: `E2E Balance ${RUN}`,
        scheduled_at: new Date(Date.now() - 10 * 60_000).toISOString(),
        status: 'SCHEDULED',
      })
      .select('id')
      .single();
    if (error || !lesson) throw new Error(`seed failed: ${error?.message}`);
    lessonId = lesson.id as string;
    const entries = () =>
      adminClient()
        .from('lesson_credit_entries')
        .select('delta, reason')
        .eq('lesson_id', lesson.id);

    // Two days back, so the lesson is past the start date whatever the time zone.
    const startOn = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
    await loginAs('teacher');
    await page.goto('/dashboard/settings?tab=billing');
    const terms = page.getByTestId('billing-terms');
    await expect(async () => {
      await terms.locator('#billing-start-on').fill(startOn);
      await page.waitForTimeout(300);
      await expect(terms.locator('#billing-start-on')).toHaveValue(startOn);
    }).toPass({ timeout: 15_000 });
    await terms.getByRole('button').click();
    await expect(terms.getByRole('status')).toBeVisible({ timeout: 15_000 });
    expect((await entries()).data).toEqual([]);

    await page.goto('/dashboard/calendar');
    const row = page
      .getByTestId('attendance-awaiting-row')
      .filter({ has: page.locator(`a[href$="${lesson.id}"]`) });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByTestId('attendance-held').click();
    await expect(row).toHaveCount(0, { timeout: 15_000 });

    expect((await entries()).data).toEqual([{ delta: -1, reason: 'lesson' }]);
  });

  test('a student has no payments tab', async ({ page, loginAs }) => {
    await loginAs('student');
    await page.goto('/dashboard/settings?tab=billing');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('billing-packages')).toHaveCount(0);
    await expect(page.locator('a[href="/dashboard/settings?tab=billing"]')).toHaveCount(0);
  });
});
