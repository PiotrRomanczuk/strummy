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
  // The Teacher test asserts on a status the Admin test wrote — fullyParallel
  // in playwright.config.ts doesn't guarantee file order across workers, so
  // without this the Teacher test can read before the Admin write commits.
  test.describe.configure({ mode: 'serial' });

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
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('tab', { name: /Beginner/ })).toContainText('mastered');
  });

  test('Teacher can update a skill status and see it persist', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.goto(`/dashboard/users/${STUDENT_ID}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: 'Skills' }).click();
    await page.getByRole('tab', { name: /Beginner/ }).click();

    // Self-contained: set the starting state directly rather than relying on
    // another test's write. fullyParallel means test order/isolation across
    // files (or workers) is never guaranteed, so cross-test DB state is unsafe.
    const fixtureSelect = page.getByLabel(`Skills: ${FIXTURE_SKILL_NAME}`);
    await fixtureSelect.selectOption('mastered');
    await page.waitForLoadState('networkidle');
    await expect(page.getByLabel(`Skills: ${FIXTURE_SKILL_NAME}`)).toHaveValue('mastered');

    await page.getByLabel(`Skills: ${FIXTURE_SKILL_NAME}`).selectOption('progressing');
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

  test('Teacher note survives a status change on the same skill', async ({ page, loginAs }) => {
    const NOTE = 'E2E note — must survive a status change';

    await loginAs('teacher');
    await page.goto(`/dashboard/users/${STUDENT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: 'Skills' }).click();
    await page.getByRole('tab', { name: /Beginner/ }).click();

    // The fixture is assessed by the tests above, so it offers a note control.
    // Every note control carries its skill name in the aria-label, so these
    // target one row without depending on DOM structure.
    await page.getByLabel(new RegExp(`^(Add|Edit) note: ${FIXTURE_SKILL_NAME}$`)).click();
    await page.getByLabel(`Note: ${FIXTURE_SKILL_NAME}`).fill(NOTE);
    await page.getByLabel(`Save: ${FIXTURE_SKILL_NAME}`).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(NOTE)).toBeVisible();

    // The regression (SKL-3): `upsertStudentSkill` used to write `notes ?? null`
    // on update, so changing only the status wiped the note. Same skill, not a
    // neighbour — a note surviving another row's edit proves nothing.
    await page.getByLabel(`Skills: ${FIXTURE_SKILL_NAME}`).selectOption('proficient');
    await page.waitForLoadState('networkidle');

    await expect(page.getByLabel(`Skills: ${FIXTURE_SKILL_NAME}`)).toHaveValue('proficient');
    await expect(page.getByText(NOTE)).toBeVisible();
  });

  test('Cancelling the note editor discards the draft', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.goto(`/dashboard/users/${STUDENT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: 'Skills' }).click();
    await page.getByRole('tab', { name: /Beginner/ }).click();

    await page.getByLabel(new RegExp(`^(Add|Edit) note: ${FIXTURE_SKILL_NAME}$`)).click();
    await page.getByLabel(`Note: ${FIXTURE_SKILL_NAME}`).fill('typed but abandoned');
    await page.getByLabel(`Cancel: ${FIXTURE_SKILL_NAME}`).click();

    await expect(page.getByText('typed but abandoned')).toHaveCount(0);
    // Reopening shows the stored note, not the abandoned draft.
    await page.getByLabel(new RegExp(`^(Add|Edit) note: ${FIXTURE_SKILL_NAME}$`)).click();
    await expect(page.getByLabel(`Note: ${FIXTURE_SKILL_NAME}`)).not.toHaveValue(
      'typed but abandoned'
    );
  });

  test('Emptying a note removes it', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.goto(`/dashboard/users/${STUDENT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: 'Skills' }).click();
    await page.getByRole('tab', { name: /Beginner/ }).click();

    // Write one, then clear it — empty normalises to null in the action, so the
    // control goes back to offering "Add note".
    await page.getByLabel(new RegExp(`^(Add|Edit) note: ${FIXTURE_SKILL_NAME}$`)).click();
    await page.getByLabel(`Note: ${FIXTURE_SKILL_NAME}`).fill('temporary note');
    await page.getByLabel(`Save: ${FIXTURE_SKILL_NAME}`).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('temporary note')).toBeVisible();

    await page.getByLabel(`Edit note: ${FIXTURE_SKILL_NAME}`).click();
    await page.getByLabel(`Note: ${FIXTURE_SKILL_NAME}`).fill('   ');
    await page.getByLabel(`Save: ${FIXTURE_SKILL_NAME}`).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('temporary note')).toHaveCount(0);
    await expect(page.getByLabel(`Add note: ${FIXTURE_SKILL_NAME}`)).toBeVisible();
  });

  test('An unassessed skill offers no note control', async ({ page, loginAs }) => {
    const db = adminClient();
    // A note needs a status to attach to — `upsertStudentSkill` requires one —
    // so the affordance must not appear before the skill is assessed.
    const { data: unassessed } = await db
      .from('skills')
      .select('id, name')
      .eq('level', 'beginner')
      .limit(30);
    const { data: assessedRows } = await db
      .from('student_skills')
      .select('skill_id')
      .eq('student_id', STUDENT_ID);
    const assessedIds = new Set((assessedRows ?? []).map((r) => r.skill_id));
    const target = (unassessed ?? []).find((s) => !assessedIds.has(s.id));
    expect(target, 'need an unassessed beginner skill').toBeTruthy();

    await loginAs('teacher');
    await page.goto(`/dashboard/users/${STUDENT_ID}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: 'Skills' }).click();
    await page.getByRole('tab', { name: /Beginner/ }).click();

    // Its status control exists...
    await expect(page.getByLabel(`Skills: ${target!.name}`)).toBeVisible();
    // ...but no note control for it.
    await expect(page.getByLabel(new RegExp(`^(Add|Edit) note: ${target!.name}$`))).toHaveCount(0);
  });

  test('Student reads the note but is offered no editor', async ({ page, loginAs }) => {
    await loginAs('student');
    await page.goto('/dashboard/my-skills');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /Add note|Edit note/ })).toHaveCount(0);
    await expect(page.locator('textarea')).toHaveCount(0);
  });
});
