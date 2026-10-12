import { test, expect } from '../fixtures';
import { openAssignmentExtras, sendAssignmentButton } from '../helpers/assignment-form';
import { runCron } from '../helpers/cron';
import { isMailpitSmtpConfigured, MAILPIT_SMTP_REQUIRED, waitForEmail } from '../helpers/mailpit';
import { adminClient, getStudentId, getTeacherId, studentEmail } from '../helpers/seed-ids';

/**
 * F05 — Assignment: create → student works it → teacher sees progress.
 */
const RUN = Date.now();
const TITLE = `E2E Flow Assignment ${RUN}`;

test.describe('F05 assignment', { tag: ['@flow'] }, () => {
  test.describe.configure({ mode: 'serial' });
  let studentId = '';
  let assignmentId: string | undefined;
  let overdueId: string | undefined;
  const statusInDb = async () =>
    (await adminClient().from('assignments').select('status').eq('id', assignmentId!).single()).data
      ?.status;

  test.beforeAll(async () => {
    studentId = await getStudentId(adminClient());
  });
  test.afterAll(async () => {
    if (!assignmentId) return;
    const db = adminClient();
    // F05.5 leaves the teacher an inbox row keyed by the assignment.
    await db.from('in_app_notifications').delete().eq('entity_id', assignmentId);
    await db.from('assignments').delete().eq('id', assignmentId);
    if (overdueId) {
      await db.from('notification_log').delete().eq('entity_id', overdueId);
      await db.from('in_app_notifications').delete().eq('entity_id', overdueId);
      await db.from('assignments').delete().eq('id', overdueId);
    }
  });

  test('F05.1 teacher sends an assignment to the student', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.goto('/dashboard/assignments/new');
    await page.locator(`[data-testid="student-pill"][data-student-id="${studentId}"]`).click();
    await openAssignmentExtras(page);
    await page.locator('#assignment-title').fill(TITLE);
    await page.locator('#assignment-notes').fill('Practise the chorus at 80 bpm');
    await sendAssignmentButton(page).click();
    await page.waitForURL(/\/dashboard\/assignments\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    assignmentId = page.url().split('/').pop();
    expect(await statusInDb()).toBe('not_started');
  });

  test('F05.2 the student sees it in their inbox', async ({ page, loginAs }) => {
    test.skip(!assignmentId, 'F05.1 did not create an assignment');
    await loginAs('student');
    await page.goto('/dashboard/assignments');
    await expect(page.locator(`a[href*="selected=${assignmentId}"]`).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('F05.3 the student starts and completes it', async ({ page, loginAs }) => {
    test.skip(!assignmentId, 'F05.1 did not create an assignment');
    await loginAs('student');
    await page.goto(`/dashboard/assignments/${assignmentId}`);
    await page.getByTestId('assignment-status-in_progress').click();
    await expect.poll(statusInDb, { timeout: 10_000 }).toBe('in_progress');
    await page.getByTestId('assignment-status-completed').click();
    await expect.poll(statusInDb, { timeout: 10_000 }).toBe('completed');
  });

  test('F05.4 the teacher sees it completed, with history', async ({ page, loginAs }) => {
    test.skip(!assignmentId, 'F05.1 did not create an assignment');
    await loginAs('teacher');
    await page.goto(`/dashboard/assignments/${assignmentId}`);
    await expect(page.getByText(/completed/i).first()).toBeVisible({ timeout: 15_000 });
    const { count } = await adminClient()
      .from('assignment_history')
      .select('id', { count: 'exact', head: true })
      .eq('assignment_id', assignmentId!);
    expect(count ?? 0).toBeGreaterThanOrEqual(2);
  });

  test('F05.5 the teacher is notified when the student completes', async ({ page, loginAs }) => {
    test.skip(!assignmentId, 'F05.1 did not create an assignment');
    await loginAs('teacher');
    await page.goto('/dashboard/notifications');
    await expect(page.getByText(TITLE).first()).toBeVisible({ timeout: 15_000 });
  });

  test('F05.6 overdue reminder reaches the student', async ({ request }) => {
    test.skip(!isMailpitSmtpConfigured(), MAILPIT_SMTP_REQUIRED);
    test.setTimeout(90_000);
    const db = adminClient();
    // Newly overdue: `due_date` is a DATE, so "overdue" means due yesterday
    // (or earlier) and still open — the one-day window the overdue check
    // alerts on exactly once.
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data: overdue, error } = await db
      .from('assignments')
      .insert({
        teacher_id: await getTeacherId(db),
        student_id: studentId,
        title: `${TITLE} overdue`,
        status: 'not_started',
        due_date: yesterday,
      })
      .select('id')
      .single();
    expect(error, `assignment seed failed: ${error?.message}`).toBeNull();
    overdueId = overdue!.id;

    const since = Date.now();
    await runCron(request, 'assignment-overdue-check');
    await runCron(request, 'process-notification-queue');

    // The same drain also delivers F05.1's "New Assignment" mail; pick ours.
    const mail = await waitForEmail(
      studentEmail(),
      30_000,
      since - 2_000,
      `Overdue Assignment: ${TITLE} overdue`
    );
    expect(mail.Subject).toContain(`Overdue Assignment: ${TITLE} overdue`);
  });
});
