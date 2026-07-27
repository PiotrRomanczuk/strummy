import { test, expect } from '../../fixtures';
import { adminClient, getStudentId } from '../../helpers/seed-ids';

/**
 * IDA-4 (docs/app-blueprint/01-identity-access.md, Tranche 3) — surface
 * onboarding preferences to the teacher.
 *
 * The about-line is stitched from TWO tables since migration 20260727120000
 * ("skill_level single source"): `profiles.skill_level` plus the
 * onboarding-owned `user_preferences.goals` / `.learning_style`. Seeding
 * skill_level into user_preferences — as this spec used to — now fails with
 * PGRST204, the column having moved.
 */

let studentId: string;

/** Clear both halves; the line renders when EITHER source has something. */
async function clearPreferences(db: ReturnType<typeof adminClient>, id: string): Promise<void> {
  await db.from('user_preferences').delete().eq('user_id', id);
  await db.from('profiles').update({ skill_level: null }).eq('id', id);
}

test.describe('Student detail — About this student', { tag: ['@teacher'] }, () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  test('a student who completed onboarding shows their skill level + goals', async ({ page }) => {
    const db = adminClient();
    studentId = await getStudentId(db);

    await clearPreferences(db, studentId);

    const { error: profileError } = await db
      .from('profiles')
      .update({ skill_level: 'advanced' })
      .eq('id', studentId);
    expect(profileError, 'skill_level lives on profiles').toBeNull();

    const { error } = await db.from('user_preferences').insert({
      user_id: studentId,
      goals: ['play_songs', 'learn_theory'],
      learning_style: ['visual'],
    });
    expect(error).toBeNull();

    await page.goto(`/dashboard/users/${studentId}`);
    await page.waitForLoadState('networkidle');

    const aboutLine = page.getByTestId('student-about-line');
    await expect(aboutLine).toBeVisible({ timeout: 15_000 });
    await expect(aboutLine).toContainText('advanced');
    await expect(aboutLine).toContainText('play_songs');
    await expect(aboutLine).toContainText('learn_theory');

    await clearPreferences(db, studentId);
  });

  test('a student without a preferences row renders no empty section', async ({ page }) => {
    const db = adminClient();
    studentId = await getStudentId(db);
    // Must clear profiles.skill_level too — leaving it set (e.g. by the test
    // above) is enough on its own to render the line.
    await clearPreferences(db, studentId);

    await page.goto(`/dashboard/users/${studentId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('student-about-line')).toHaveCount(0);
  });
});
