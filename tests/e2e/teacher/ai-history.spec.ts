import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';

/**
 * A9.3 — AI generation history: list · star · filter. Seeds a generation owned
 * by the teacher (ai_generations.profile_id = profiles.id, NOT the auth id),
 * then proves it lists, can be starred (persists), and the Starred filter keeps it.
 */
const ts = Date.now();
const MARKER = `E2E generation ${ts}`;
const OUTPUT = `${MARKER} — practice barre chords daily at 60 BPM`;
const TEACHER_EMAIL = process.env.TEST_TEACHER_EMAIL || 'teacher@dev.local';

test.describe('AI generation history', { tag: ['@teacher', '@ai'] }, () => {
  let seededId: string | null = null;

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  test.afterEach(async () => {
    if (seededId) {
      await adminClient().from('ai_generations').delete().eq('id', seededId);
      seededId = null;
    }
  });

  test('lists a generation, stars it, and the Starred filter keeps it', async ({ page }) => {
    test.setTimeout(120_000);
    const db = adminClient();

    // Owner = the teacher's PROFILE id. ai_generations.profile_id is a
    // profiles.id FK; auth.uid() (profiles.user_id) is a different uuid and
    // seeding it here only appeared to work because the dev role accounts
    // happen to have id == user_id.
    const { data: prof, error: profErr } = await db
      .from('profiles')
      .select('id')
      .eq('email', TEACHER_EMAIL)
      .single();
    expect(profErr, 'teacher profile lookup').toBeNull();

    const { data: gen, error: insErr } = await db
      .from('ai_generations')
      .insert({
        profile_id: prof!.id,
        generation_type: 'lesson_notes',
        input_params: {},
        output_content: OUTPUT,
        is_successful: true,
        is_starred: false,
      })
      .select('id')
      .single();
    expect(insErr, 'seed generation').toBeNull();
    seededId = gen!.id as string;

    // List: the seeded generation shows.
    await page.goto('/dashboard/ai/history');
    await expect(page.getByText(MARKER, { exact: false }).first()).toBeVisible({ timeout: 15_000 });

    // Star it → the row button flips to "Unstar generation".
    await page.getByRole('button', { name: 'Star generation' }).first().click();
    await expect(page.getByRole('button', { name: 'Unstar generation' }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Filter by Starred → the now-starred generation still shows.
    await page.getByRole('button', { name: /Starred/ }).click();
    await expect(page.getByText(MARKER, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });
});
