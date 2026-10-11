import { test, expect } from '../fixtures';
import { adminClient, getStudentId } from '../helpers/seed-ids';

/**
 * F08 — Skills: chord quiz with SRS, checklist, roadmap.
 */
test.describe('F08 skills', { tag: ['@flow'] }, () => {
  test('F08.1 the student answers a quiz question and the attempt is saved', async ({
    page,
    loginAs,
  }) => {
    test.skip(
      true,
      'TODO automate: quiz start/answer controls differ from the guess; see student/chord-quiz-srs.spec.ts'
    );
    const studentId = await getStudentId(adminClient());
    const before =
      (
        await adminClient()
          .from('chord_quiz_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentId)
      ).count ?? 0;

    await loginAs('student');
    await page.goto('/dashboard/skills/chord-quiz');
    await page
      .getByRole('button', { name: /start|random/i })
      .first()
      .click();
    await expect(page.getByText(/question 1 of/i)).toBeVisible({ timeout: 15_000 });
    await page
      .getByRole('button', { name: /^[A-G]/ })
      .first()
      .click();
    await page
      .getByRole('button', { name: /next|continue/i })
      .first()
      .click();

    await expect
      .poll(
        async () =>
          (
            await adminClient()
              .from('chord_quiz_attempts')
              .select('id', { count: 'exact', head: true })
              .eq('student_id', studentId)
          ).count ?? 0,
        { timeout: 10_000 }
      )
      .toBeGreaterThan(before);
  });

  test('F08.2 the teacher ticks a skill and the student sees it mastered', async () => {
    test.skip(
      true,
      'TODO automate: cross-role/student-skills.spec.ts covers this against a seeded catalog skill'
    );
  });

  test('F08.3 the roadmap groups skills by lesson', async () => {
    test.skip(true, 'TODO automate: cross-role/student-skills-roadmap.spec.ts');
  });
});
