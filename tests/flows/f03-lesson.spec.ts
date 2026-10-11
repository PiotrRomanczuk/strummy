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
    test.skip(
      true,
      'TODO automate: the repeat-weekly control is not a role=switch named repeat; see teacher/lesson-repeat-weekly.spec.ts'
    );
    await loginAs('teacher');
    await page.goto('/dashboard/lessons/new?repeat=weekly');
    await expect(page.locator('#lesson-title')).toBeVisible({ timeout: 15_000 });
    await pickLessonStudentById(page, studentId);
    await page.locator('#lesson-title').fill(`${TITLE} weekly`);
    await setLessonWhen(page, '2030-04-01T10:00');
    const repeat = page.getByRole('switch', { name: /repeat/i }).first();
    if ((await repeat.getAttribute('aria-checked')) !== 'true') await repeat.click();
    await page.getByRole('button', { name: 'Schedule lesson' }).click();
    await page.waitForURL(/\/dashboard\/lessons/, { timeout: 20_000 });

    const { count } = await adminClient()
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .like('title', `${TITLE} weekly%`);
    expect(count ?? 0).toBeGreaterThanOrEqual(2);
  });

  test('F03.4 a 24h reminder reaches the student', async () => {
    test.fixme(
      true,
      'NOT BUILT: dispatcher runs once a day at 06:00 UTC with a 23–25h window and processes the queue in parallel, and STUDENT_EMAILS_ENABLED is unset'
    );
  });
});
