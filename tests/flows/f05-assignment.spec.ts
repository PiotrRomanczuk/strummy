import { test, expect } from '../fixtures';
import { openAssignmentExtras, sendAssignmentButton } from '../helpers/assignment-form';
import { adminClient, getStudentId } from '../helpers/seed-ids';

/**
 * F05 — Assignment: create → student works it → teacher sees progress.
 */
const RUN = Date.now();
const TITLE = `E2E Flow Assignment ${RUN}`;

test.describe('F05 assignment', { tag: ['@flow'] }, () => {
  test.describe.configure({ mode: 'serial' });
  let studentId = '';
  let assignmentId: string | undefined;
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

  test('F05.6 overdue reminder reaches the student', async () => {
    test.fixme(true, 'NOT BUILT: same once-a-day dispatcher problem as F03.4');
  });
});
