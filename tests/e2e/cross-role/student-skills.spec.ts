import { test, expect } from '../../fixtures';
import { adminClient, getStudentId } from '../../helpers/seed-ids';

/**
 * Cross-Role Tests: Student Skills Tracking
 * Verifies that Admin, Teacher, and Student roles have the correct access
 * to the Student Skills feature on the user profile page.
 */

test.describe('Student Skills Tracking', { tag: ['@cross-role', '@skills'] }, () => {
  let STUDENT_ID = '';

  test.beforeAll(async () => {
    const db = adminClient();
    STUDENT_ID = await getStudentId(db);

    // Ensure at least one skill exists for the UI test
    const { data: existingSkills } = await db
      .from('skills')
      .select('id')
      .eq('name', 'E2E Test Skill')
      .limit(1);
    let skillId;
    if (!existingSkills || existingSkills.length === 0) {
      const { data } = await db
        .from('skills')
        .insert({ name: 'E2E Test Skill', category: 'Technique' })
        .select('id')
        .single();
      skillId = data?.id;
    } else {
      skillId = existingSkills[0].id;
    }

    // Clear the assignment for this student so the test can assign it
    if (skillId) {
      await db.from('student_skills').delete().match({ student_id: STUDENT_ID, skill_id: skillId });
    }
  });

  test('Admin can assign and view student skills', async ({ page, loginAs }) => {
    await loginAs('admin');

    // Navigate to the test student's profile
    await page.goto(`/dashboard/users/${STUDENT_ID}`);
    await page.waitForLoadState('networkidle');

    // Click the Skills tab
    await page.getByRole('tab', { name: 'Skills' }).click();

    // Verify admin can see the Assign New Skill section
    await expect(page.getByText('Assign New Skill')).toBeVisible();

    // Assign a new skill — select the fixture by its option value, not by
    // index. The catalog now has 70+ real seeded skills (20260805110000,
    // 20260806090000), so "first real option" is no longer this fixture.
    const skillSelect = page.locator('select#new-skill-select');
    const fixtureOptionValue = await skillSelect
      .locator('option', { hasText: 'E2E Test Skill' })
      .getAttribute('value');
    await skillSelect.selectOption(fixtureOptionValue!);
    await page.getByRole('button', { name: 'Assign' }).click();

    // Verify it appears in the student's list
    await expect(page.locator('.font-medium', { hasText: 'E2E Test Skill' }).first()).toBeVisible();
  });

  test('Teacher can assign and view student skills', async ({ page, loginAs }) => {
    await loginAs('teacher');

    await page.goto(`/dashboard/users/${STUDENT_ID}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: 'Skills' }).click();

    await expect(page.getByText('Assign New Skill')).toBeVisible();

    // Same fixture as the admin test, selected the same deterministic way.
    // This used to be `selectOption({ index: 1 })`, which — now that the
    // catalog has 70+ real skills — picked a different real skill on every
    // CI run and never cleaned it up, permanently accumulating junk
    // assignments on the shared student@dev.local account.
    const skillSelect = page.locator('select#new-skill-select');
    const fixtureOptionValue = await skillSelect
      .locator('option', { hasText: 'E2E Test Skill' })
      .getAttribute('value');
    if (fixtureOptionValue) {
      await skillSelect.selectOption(fixtureOptionValue);
      await page.getByRole('button', { name: 'Assign' }).click();
    }
  });

  test('Student can view skills but not assign them', async ({ page, loginAs }) => {
    await loginAs('student');

    // Students access their own profile
    await page.goto(`/dashboard/users/${STUDENT_ID}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: 'Skills' }).click();

    // Verify student cannot see the Assign New Skill section
    await expect(page.getByText('Assign New Skill')).toBeHidden();

    // Verify they cannot see the status dropdowns
    const statusSelect = page.locator('select').first();
    await expect(statusSelect).toBeHidden();
  });
});
