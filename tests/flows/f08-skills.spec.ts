import { test, expect } from '../fixtures';
import { adminClient, getStudentId } from '../helpers/seed-ids';

/**
 * F08 — Skills: chord quiz with SRS, checklist, roadmap.
 *
 * Catalog skills are seeded here with a per-run name and deleted by id, so the
 * checklist and roadmap steps never depend on what the catalog happens to hold.
 * The roadmap fixtures get a per-run `lesson_group` far outside the real beginner
 * roadmap (1–11), so that lesson bucket contains only these two skills and
 * "1/2 mastered" is exact even next to other specs' leftover fixtures.
 */
const RUN = Date.now().toString(36);
const SKILL_NAME = `E2E Flow Skill ${RUN}`;
const ROADMAP_SKILL_A = `E2E Flow Roadmap A ${RUN}`;
const ROADMAP_SKILL_B = `E2E Flow Roadmap B ${RUN}`;
const ROADMAP_LESSON = 100_000 + (Date.now() % 900_000);

test.describe('F08 skills', { tag: ['@flow'] }, () => {
  test.describe.configure({ mode: 'serial' });
  let studentId = '';
  const skillIds: string[] = [];
  const startedAt = new Date().toISOString();

  test.beforeAll(async () => {
    const db = adminClient();
    studentId = await getStudentId(db);
    const { data, error } = await db
      .from('skills')
      .insert([
        { name: SKILL_NAME, category: 'Technique', level: 'beginner' },
        {
          name: ROADMAP_SKILL_A,
          category: 'Technique',
          level: 'beginner',
          lesson_group: ROADMAP_LESSON,
        },
        {
          name: ROADMAP_SKILL_B,
          category: 'Technique',
          level: 'beginner',
          lesson_group: ROADMAP_LESSON,
        },
      ])
      .select('id');
    expect(error, `skills seed failed: ${error?.message}`).toBeNull();
    skillIds.push(...(data ?? []).map((r) => r.id as string));
  });

  test.afterAll(async () => {
    const db = adminClient();
    if (skillIds.length > 0) {
      await db.from('student_skills').delete().eq('student_id', studentId).in('skill_id', skillIds);
      await db.from('skills').delete().in('id', skillIds);
    }
    const { data: attempts } = await db
      .from('chord_quiz_attempts')
      .select('id')
      .eq('student_id', studentId)
      .gte('created_at', startedAt);
    const attemptIds = (attempts ?? []).map((r) => r.id as string);
    if (attemptIds.length > 0) await db.from('chord_quiz_attempts').delete().in('id', attemptIds);
  });

  const attemptCount = async () =>
    (
      await adminClient()
        .from('chord_quiz_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentId)
    ).count ?? 0;

  test('F08.1 the student plays a quiz session and the attempts are saved', async ({
    page,
    loginAs,
  }) => {
    test.setTimeout(90_000);
    const before = await attemptCount();

    await loginAs('student');
    await page.goto('/dashboard/skills/chord-quiz');
    await expect(page.locator('text=/Question 1 of/')).toBeVisible({ timeout: 15_000 });

    // Attempts are written once, when the session ends — so play it through.
    // A wrong answer costs a heart; either the last question or an empty heart
    // bar ends the session, and both paths submit.
    const choice = page.locator('button.ui-quiz-choice').first();
    const playAgain = page.getByRole('button', { name: /play again/i });
    for (let i = 0; i < 10; i++) {
      await expect(choice.or(playAgain).first()).toBeVisible({ timeout: 10_000 });
      if (await playAgain.isVisible()) break;
      await choice.click();
      await expect(page.locator('text=/Correct!|Correct answer:/').first()).toBeVisible({
        timeout: 5_000,
      });
      await page.getByRole('button', { name: /next question|see results/i }).click();
    }
    await expect(playAgain).toBeVisible({ timeout: 10_000 });

    await expect.poll(attemptCount, { timeout: 15_000 }).toBeGreaterThan(before);
  });

  test('F08.2 the teacher ticks a skill and the student sees it mastered', async ({
    page,
    loginAs,
  }) => {
    // Two logins and a cold compile of the student page: not a 30s test.
    test.setTimeout(90_000);
    await loginAs('teacher');
    await page.goto(`/dashboard/users/${studentId}`);
    await page.getByRole('tab', { name: 'Skills' }).click();
    await page.getByRole('tab', { name: /Beginner/ }).click();

    const select = page.getByLabel(`Skills: ${SKILL_NAME}`);
    await expect(select).toBeVisible({ timeout: 15_000 });
    await select.selectOption('mastered');
    await expect
      .poll(
        async () =>
          (
            await adminClient()
              .from('student_skills')
              .select('status')
              .eq('student_id', studentId)
              .eq('skill_id', skillIds[0])
              .maybeSingle()
          ).data?.status,
        { timeout: 10_000 }
      )
      .toBe('mastered');

    await page.context().clearCookies();
    await loginAs('student');
    // `domcontentloaded`: a cold compile of this route can hold the load event
    // past 30s on a busy dev server; the tab assertion below is the real wait.
    await page.goto('/dashboard/my-skills', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByRole('tab', { name: /Beginner/ }).click({ timeout: 30_000 });
    // name div → text column → row; the status badge is the row's second column.
    const row = page.getByText(SKILL_NAME, { exact: true }).locator('xpath=../..');
    await expect(row).toContainText('Mastered', { timeout: 15_000 });
    // Read-only for the student: no status control anywhere.
    await expect(page.getByLabel(`Skills: ${SKILL_NAME}`)).toHaveCount(0);
  });

  test('F08.3 the roadmap groups skills by lesson with per-lesson progress', async ({
    page,
    loginAs,
  }) => {
    await loginAs('teacher');
    await page.goto(`/dashboard/users/${studentId}`);
    await page.getByRole('tab', { name: 'Skills' }).click();
    await page.getByRole('tab', { name: /Beginner/ }).click();

    await expect(page.getByText(`Lesson ${ROADMAP_LESSON}`, { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(ROADMAP_SKILL_A)).toBeVisible();
    await expect(page.getByText(ROADMAP_SKILL_B)).toBeVisible();

    await page.getByLabel(`Skills: ${ROADMAP_SKILL_A}`).selectOption('mastered');

    // Lesson-scoped progress: the header row of lesson 999, not the level tab.
    const lessonHeader = page
      .locator('div')
      .filter({ has: page.getByText(`Lesson ${ROADMAP_LESSON}`, { exact: true }) })
      .last();
    await expect(lessonHeader.getByText('1/2 mastered')).toBeVisible({ timeout: 10_000 });
  });

  test('F08.4 the teacher reaches Skills from the sidebar', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.goto('/dashboard');
    await page.locator('[data-nav-item="Skills"]').first().click();
    await expect(page).toHaveURL(/\/dashboard\/skills$/, { timeout: 15_000 });
    await expect(page.locator('main').first()).toBeVisible();
  });
});
