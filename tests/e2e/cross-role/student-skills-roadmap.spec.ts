import { test, expect } from '../../fixtures';
import { adminClient, getStudentId } from '../../helpers/seed-ids';

/**
 * Cross-Role Tests: Skills Lesson Roadmap
 * Verifies that the Skills tab groups a level's catalog into numbered
 * "lessons" (via `skills.lesson_group`) with a per-lesson progress
 * indicator, and that the milestone lesson is marked — for Admin/Teacher
 * (editable) and Student (read-only) POV. Complements
 * `student-skills.spec.ts`, which guards the pre-roadmap flat-catalog
 * contract and is left untouched.
 */

const FIXTURE_SKILL_A = 'E2E Roadmap Skill A';
const FIXTURE_SKILL_B = 'E2E Roadmap Skill B';
// Deliberately out of range of the real beginner roadmap (1-11, see
// 20260814130000_skills_lesson_roadmap.sql) so this lesson bucket contains
// only these two fixtures — a real lesson number would mix in whatever
// production skills are already mapped to it and throw off the "1/2
// mastered" assertions below.
const FIXTURE_LESSON = 999;

test.describe('Skills Lesson Roadmap', { tag: ['@cross-role', '@skills'] }, () => {
  // Teacher test asserts on a status the fixture starts with; Student test
  // reads what Teacher left behind. fullyParallel doesn't guarantee file
  // order across workers, so serial mode keeps this self-consistent.
  test.describe.configure({ mode: 'serial' });

  let STUDENT_ID = '';

  const upsertFixtureSkill = async (name: string) => {
    const db = adminClient();
    const { data: existing } = await db.from('skills').select('id').eq('name', name).limit(1);
    if (existing && existing.length > 0) {
      const skillId = existing[0].id;
      await db
        .from('skills')
        .update({ level: 'beginner', lesson_group: FIXTURE_LESSON })
        .eq('id', skillId);
      return skillId as string;
    }
    const { data } = await db
      .from('skills')
      .insert({ name, category: 'Technique', level: 'beginner', lesson_group: FIXTURE_LESSON })
      .select('id')
      .single();
    return data?.id as string;
  };

  test.beforeAll(async () => {
    const db = adminClient();
    STUDENT_ID = await getStudentId(db);

    const skillIdA = await upsertFixtureSkill(FIXTURE_SKILL_A);
    const skillIdB = await upsertFixtureSkill(FIXTURE_SKILL_B);

    // Reset assignments so each run starts from "not started".
    await db
      .from('student_skills')
      .delete()
      .match({ student_id: STUDENT_ID })
      .in('skill_id', [skillIdA, skillIdB]);
  });

  test('Teacher sees the beginner catalog grouped into lessons and can update progress', async ({
    page,
    loginAs,
  }) => {
    await loginAs('teacher');
    await page.goto(`/dashboard/users/${STUDENT_ID}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: 'Skills' }).click();
    await page.getByRole('tab', { name: /Beginner/ }).click();

    await expect(page.getByText('Lesson 999', { exact: true })).toBeVisible();
    await expect(page.getByText(FIXTURE_SKILL_A)).toBeVisible();
    await expect(page.getByText(FIXTURE_SKILL_B)).toBeVisible();

    // The last mapped beginner lesson (11) is the milestone checkpoint.
    await expect(page.getByText('Milestone')).toBeVisible();

    const fixtureSelectA = page.getByLabel(`Skills: ${FIXTURE_SKILL_A}`);
    await expect(fixtureSelectA).toBeVisible();
    await fixtureSelectA.selectOption('mastered');
    await page.waitForLoadState('networkidle');

    // Lesson-scoped progress label updates, not just the level tab's.
    await expect(page.getByText('1/2 mastered')).toBeVisible();
  });

  test('Student can view the lesson roadmap read-only but not edit it', async ({
    page,
    loginAs,
  }) => {
    await loginAs('student');
    await page.goto(`/dashboard/users/${STUDENT_ID}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: 'Skills' }).click();
    await page.getByRole('tab', { name: /Beginner/ }).click();

    await expect(page.getByText('Lesson 999', { exact: true })).toBeVisible();
    await expect(page.getByText(FIXTURE_SKILL_A)).toBeVisible();

    // Scoped to lesson 999's own header row, not searched page-wide.
    // "1/2 mastered" is a LESSON-scoped label, and asserting it globally only
    // held while no other lesson happened to share the ratio. When a second
    // fixture landed in the ungrouped "Additional skills" bucket and made it
    // 1/2 as well, this became a strict-mode violation ("resolved to 2
    // elements") and took out a required check. Scoping states what the test
    // actually means and stops any future fixture from colliding with it.
    const lessonHeader = page
      .locator('div')
      .filter({ has: page.getByText('Lesson 999', { exact: true }) })
      .last();
    await expect(lessonHeader.getByText('1/2 mastered')).toBeVisible();

    // No status <select> anywhere in the roadmap for a student.
    await expect(page.getByLabel(`Skills: ${FIXTURE_SKILL_A}`)).toHaveCount(0);
  });
});
