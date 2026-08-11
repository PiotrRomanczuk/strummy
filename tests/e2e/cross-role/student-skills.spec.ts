import { test, expect } from '../../fixtures';
import { adminClient, getStudentId } from '../../helpers/seed-ids';

/**
 * Cross-Role Tests: Student Skills Checklist
 * Verifies that Admin, Teacher, and Student roles have the correct access to
 * the per-level Skills checklist on the student profile page, and that the
 * checklist shows the full catalog for a level (not just previously-assigned
 * skills).
 */

const FIXTURE_SKILL_NAME = 'E2E Test Skill';
// A real seeded catalog entry we never write to — used to assert the
// checklist renders the whole level catalog, not just assigned skills.
const KNOWN_BEGINNER_SKILL = 'Open chords (E, A, D, G, C)';

test.describe('Student Skills Checklist', { tag: ['@cross-role', '@skills'] }, () => {
  let STUDENT_ID = '';

  test.beforeAll(async () => {
    const db = adminClient();
    STUDENT_ID = await getStudentId(db);

    const { data: existingSkills } = await db
      .from('skills')
      .select('id')
      .eq('name', FIXTURE_SKILL_NAME)
      .limit(1);
    let skillId: string | undefined;
    if (!existingSkills || existingSkills.length === 0) {
      const { data } = await db
        .from('skills')
        .insert({ name: FIXTURE_SKILL_NAME, category: 'Technique', level: 'beginner' })
        .select('id')
        .single();
      skillId = data?.id;
    } else {
      skillId = existingSkills[0].id;
      await db.from('skills').update({ level: 'beginner' }).eq('id', skillId);
    }

    // Reset the assignment so each run starts from "not started".
    if (skillId) {
      await db.from('student_skills').delete().match({ student_id: STUDENT_ID, skill_id: skillId });
    }
  });

  test('Admin sees the full beginner catalog and can check off a skill', async ({
    page,
    loginAs,
  }) => {
    await loginAs('admin');
    await page.goto(`/dashboard/users/${STUDENT_ID}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: 'Skills' }).click();
    await page.getByRole('tab', { name: /Beginner/ }).click();

    // Every catalog skill for the level shows up, not only assigned ones.
    await expect(page.getByText(KNOWN_BEGINNER_SKILL)).toBeVisible();
    await expect(page.getByText(FIXTURE_SKILL_NAME)).toBeVisible();

    const fixtureSelect = page.getByLabel(`Skills: ${FIXTURE_SKILL_NAME}`);
    await expect(fixtureSelect).toBeVisible();
    await fixtureSelect.selectOption('mastered');

    await expect(page.getByRole('tab', { name: /Beginner/ })).toContainText('mastered');
  });

  test('Teacher can update a skill status and see it persist', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.goto(`/dashboard/users/${STUDENT_ID}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: 'Skills' }).click();
    await page.getByRole('tab', { name: /Beginner/ }).click();

    const fixtureSelect = page.getByLabel(`Skills: ${FIXTURE_SKILL_NAME}`);
    await expect(fixtureSelect).toHaveValue('mastered');

    await fixtureSelect.selectOption('progressing');
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel(`Skills: ${FIXTURE_SKILL_NAME}`)).toHaveValue('progressing');
  });

  test('Student can view the checklist read-only but not edit it', async ({ page, loginAs }) => {
    await loginAs('student');
    await page.goto(`/dashboard/users/${STUDENT_ID}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: 'Skills' }).click();
    await page.getByRole('tab', { name: /Beginner/ }).click();

    // Full catalog still visible read-only.
    await expect(page.getByText(KNOWN_BEGINNER_SKILL)).toBeVisible();
    await expect(page.getByText(FIXTURE_SKILL_NAME)).toBeVisible();

    // No status <select> anywhere in the checklist for a student.
    await expect(page.getByLabel(`Skills: ${FIXTURE_SKILL_NAME}`)).toHaveCount(0);
  });
});
