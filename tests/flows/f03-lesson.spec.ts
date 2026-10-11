import { test, expect } from '../fixtures';
import { pickLessonStudentById, setLessonWhen } from '../helpers/lesson-form';
import { adminClient, getStudentId } from '../helpers/seed-ids';

/**
 * F03 — Teacher schedules a lesson → student sees it → reminder.
 */
const RUN = Date.now();
const TITLE = `E2E Flow Lesson ${RUN}`;

test.describe('F03 lesson', { tag: ['@flow'] }, () => {
  test.describe.configure({ mode: 'serial' });
  let studentId = '';
  let lessonId: string | undefined;

  test.beforeAll(async () => {
    studentId = await getStudentId(adminClient());
  });
  test.afterAll(async () => {
    const db = adminClient();
    if (lessonId) await db.from('lessons').delete().eq('id', lessonId);
    await db.from('lessons').delete().like('title', `E2E Flow Lesson ${RUN}%`);
  });

  test('F03.1 teacher schedules a lesson for the student', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.goto('/dashboard/lessons/new');
    await expect(page.locator('#lesson-title')).toBeVisible({ timeout: 15_000 });
    await pickLessonStudentById(page, studentId);
    await page.locator('#lesson-title').fill(TITLE);
    await setLessonWhen(page, '2030-03-10T10:00');
    await page.getByRole('button', { name: 'Schedule lesson' }).click();
    await page.waitForURL(/\/dashboard\/lessons\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    lessonId = page.url().split('/').pop();

    const { data } = await adminClient()
      .from('lessons')
      .select('student_id, status')
      .eq('id', lessonId!)
      .single();
    expect(data?.student_id).toBe(studentId);
    expect(data?.status).toBe('SCHEDULED');
  });

  test('F03.2 the student sees it on the list', async ({ page, loginAs }) => {
    test.skip(!lessonId, 'F03.1 did not create a lesson');
    await loginAs('student');
    await page.goto('/dashboard/lessons?year=2030');
    await expect(page.getByText(TITLE).filter({ visible: true }).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.goto(`/dashboard/lessons/${lessonId}`);
    await expect(page.getByText(TITLE).filter({ visible: true }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('F03.3 weekly repeat creates the series', async ({ page, loginAs }) => {
    test.setTimeout(60_000);
    const weeklyTitle = `${TITLE} weekly`;
    await loginAs('teacher');
    await page.goto('/dashboard/lessons/new');
    await expect(page.locator('#lesson-title')).toBeVisible({ timeout: 15_000 });
    await pickLessonStudentById(page, studentId);
    await page.locator('#lesson-title').fill(weeklyTitle);
    await setLessonWhen(page, '2030-04-01T10:00');

    // The repeat control is a checkbox that reveals the week count.
    await page.getByTestId('lesson-repeat-weekly-checkbox').check();
    await expect(page.getByTestId('lesson-repeat-weeks-select')).toBeVisible();
    await page.getByTestId('lesson-repeat-weeks-select').selectOption('4');
    await page.getByRole('button', { name: 'Schedule lesson' }).click();
    // A series has no single lesson to land on: back to the list.
    await page.waitForURL(/\/dashboard\/lessons$/, { timeout: 30_000 });

    const { data: series } = await adminClient()
      .from('lessons')
      .select('scheduled_at, student_id, status')
      .eq('title', weeklyTitle)
      .order('scheduled_at', { ascending: true });
    expect(series).toHaveLength(4);
    const rows = series!;
    for (const row of rows) {
      expect(row.student_id).toBe(studentId);
      expect(row.status).toBe('SCHEDULED');
    }
    const week = 7 * 24 * 60 * 60 * 1000;
    for (let i = 1; i < rows.length; i++) {
      const gap =
        new Date(rows[i].scheduled_at).getTime() - new Date(rows[i - 1].scheduled_at).getTime();
      expect(gap).toBe(week);
    }

    // The student sees the whole series.
    await loginAs('student');
    await page.goto('/dashboard/lessons?year=2030');
    await expect(page.getByText(weeklyTitle).filter({ visible: true })).toHaveCount(4, {
      timeout: 15_000,
    });
  });

  test('F03.4 a 24h reminder reaches the student', async () => {
    test.fixme(
      true,
      'NOT BUILT: dispatcher runs once a day at 06:00 UTC with a 23–25h window and processes the queue in parallel, and STUDENT_EMAILS_ENABLED is unset'
    );
  });
});
