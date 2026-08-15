import { test, expect } from '../../fixtures';
import { adminClient, getStudentId } from '../../helpers/seed-ids';
import { openNav } from '../../helpers/dashboard';

/**
 * Cross-Role Tests: the student's own skill checklist (`/dashboard/my-skills`).
 *
 * SKL-1. Until 2026-08-15 a student could only reach their assessments by
 * typing `/dashboard/users/<their own id>` — the teacher had been assessing
 * into a screen the student had no way to open. This spec pins the three things
 * that make the new route trustworthy:
 *
 *   1. a student reaches it from the sidebar, and sees assessed skills there
 *   2. it is read-only — no `<select>` reaches a student, ever
 *   3. staff are redirected: they assess per student, from the roster
 *
 * Sibling spec `student-skills.spec.ts` covers the teacher-side checklist on
 * the student profile; this one is only about the student's own view.
 */

const FIXTURE_SKILL_NAME = 'E2E My-Skills Fixture';
// Its own lesson, never the null/"Additional skills" bucket. A beginner skill
// with no `lesson_group` joins a bucket shared with every other spec's
// fixtures and shifts its "N/M mastered" label — which collided with
// `student-skills-roadmap.spec.ts`'s lesson-999 assertion and broke a
// REQUIRED check. A fixture must be invisible to specs that do not know it.
const FIXTURE_LESSON = 998;

test.describe('My Skills (student self-view)', { tag: ['@cross-role', '@skills'] }, () => {
  // The student tests read a status the beforeAll wrote; serial keeps the
  // read after the write regardless of worker scheduling (same reason as
  // student-skills.spec.ts).
  test.describe.configure({ mode: 'serial' });

  let STUDENT_ID = '';
  let SKILL_ID = '';

  test.beforeAll(async () => {
    const db = adminClient();
    STUDENT_ID = await getStudentId(db);

    const { data: existing } = await db
      .from('skills')
      .select('id')
      .eq('name', FIXTURE_SKILL_NAME)
      .limit(1);

    if (existing && existing.length > 0) {
      SKILL_ID = existing[0].id;
      await db
        .from('skills')
        .update({ level: 'beginner', lesson_group: FIXTURE_LESSON })
        .eq('id', SKILL_ID);
    } else {
      const { data } = await db
        .from('skills')
        .insert({
          name: FIXTURE_SKILL_NAME,
          category: 'Technique',
          level: 'beginner',
          lesson_group: FIXTURE_LESSON,
        })
        .select('id')
        .single();
      SKILL_ID = data?.id ?? '';
    }

    // The student view shows ONLY assessed skills, so the fixture has to be
    // assessed for there to be anything to assert on.
    await db
      .from('student_skills')
      .upsert(
        { student_id: STUDENT_ID, skill_id: SKILL_ID, status: 'mastered' },
        { onConflict: 'student_id,skill_id' }
      );
  });

  test('Student reaches their checklist from the sidebar and sees an assessment', async ({
    page,
    loginAs,
  }) => {
    await loginAs('student');
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Reaching it by clicking, not by URL, is the whole point of SKL-1.
    // `openNav` matters: below md the aside is hidden and the same items live
    // in the topbar sheet, so a bare click here passes on desktop only.
    await openNav(page);
    await page.getByRole('link', { name: 'My Skills' }).first().click();
    await page.waitForURL('**/dashboard/my-skills');

    await expect(page.getByText(FIXTURE_SKILL_NAME)).toBeVisible();
    // Student-voiced header, not the teacher's "this student" copy.
    await expect(page.getByText('The skills your teacher is tracking with you.')).toBeVisible();
  });

  test('Student cannot edit anything on their own checklist', async ({ page, loginAs }) => {
    await loginAs('student');
    await page.goto('/dashboard/my-skills');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(FIXTURE_SKILL_NAME)).toBeVisible();
    // The teacher's control is a labelled <select> per row; a student gets none.
    await expect(page.getByLabel(/^Skills: /)).toHaveCount(0);
    await expect(page.locator('select')).toHaveCount(0);
  });

  test('Student sees only assessed skills, not the whole catalog', async ({ page, loginAs }) => {
    const db = adminClient();
    // A catalog entry that exists at this level but is NOT assessed for this
    // student. The teacher-side checklist shows it; this view must not.
    const { data: unassessed } = await db
      .from('skills')
      .select('id, name')
      .eq('level', 'beginner')
      .neq('id', SKILL_ID)
      .limit(20);

    const { data: assessedRows } = await db
      .from('student_skills')
      .select('skill_id')
      .eq('student_id', STUDENT_ID);
    const assessedIds = new Set((assessedRows ?? []).map((r) => r.skill_id));
    const hidden = (unassessed ?? []).find((s) => !assessedIds.has(s.id));
    expect(hidden, 'need at least one unassessed beginner skill to assert on').toBeTruthy();

    await loginAs('student');
    await page.goto('/dashboard/my-skills');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(FIXTURE_SKILL_NAME)).toBeVisible();
    await expect(page.getByText(hidden!.name, { exact: true })).toHaveCount(0);
  });

  test('Student on a level they have not reached gets an explanation, not a blank panel', async ({
    page,
    loginAs,
  }) => {
    // Regression: the assessed-only filter removed every lesson at a level the
    // student has not started, while `activeSkills` was non-empty (the catalog
    // has plenty there) — so the "no skills catalogued" branch never fired and
    // the panel rendered completely empty, with no explanation at all.
    await loginAs('student');
    await page.goto('/dashboard/my-skills');
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: /Intermediate/i }).click();

    await expect(page.getByText(/Nothing assessed at this level yet/i)).toBeVisible();
    // And emphatically NOT the catalog-flavoured copy, which would be a false
    // statement to show a student: those skills exist, they just aren't theirs yet.
    await expect(page.getByText(/No skills catalogued at this level/i)).toHaveCount(0);
  });

  // The "student has NO assessments at all" state is covered by a unit test
  // (`SkillsChecklist.empty.test.tsx`), not here — deliberately.
  //
  // The E2E version of it deleted every `student_skills` row for the shared dev
  // student and restored them afterwards. Playwright's `fullyParallel` runs
  // spec FILES concurrently, so during that window `student-skills-roadmap.spec.ts`
  // read the same student and saw an empty checklist: it went red on CI run
  // 31896924565 while passing on retry, which is the signature of exactly this
  // race. `test.describe.configure({ mode: 'serial' })` orders tests WITHIN a
  // file and does nothing across files.
  //
  // Rule of thumb this cost us: an E2E may create and clean up its OWN fixture
  // rows, but must never delete rows a shared seeded account already owns.
  for (const role of ['teacher', 'admin'] as const) {
    test(`${role} is redirected to the roster`, async ({ page, loginAs }) => {
      await loginAs(role);
      await page.goto('/dashboard/my-skills');
      // Staff assess per student; an empty "my skills" would be a worse answer
      // than sending them where the assessments actually live.
      await page.waitForURL('**/dashboard/users');
      await expect(page).toHaveURL(/\/dashboard\/users$/);
    });
  }
});
