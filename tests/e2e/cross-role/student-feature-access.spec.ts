import { test, expect } from '../../fixtures';
import { adminClient, getStudentId } from '../../helpers/seed-ids';

/**
 * A student sees an optional feature only after their teacher turns it on.
 * The song harmony card is the first feature behind this access table.
 */

const HARMONY_TITLE = 'What the harmony is doing';
const SONG_TITLE = `E2E harmony ${Date.now()}`;

test.describe('Per-student feature access', { tag: ['@cross-role', '@access-control'] }, () => {
  test.describe.configure({ mode: 'serial' });

  let db: ReturnType<typeof adminClient>;
  let songId: string;
  let studentId: string;

  test.beforeAll(async () => {
    db = adminClient();
    studentId = await getStudentId(db);
    const { data, error } = await db
      .from('songs')
      .insert({
        title: SONG_TITLE,
        author: 'E2E',
        chords: 'C, Am, F, G',
        key: 'C',
        level: 'beginner',
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(`could not seed song: ${error?.message}`);
    songId = data.id;
    await db.from('student_feature_access').delete().eq('student_id', studentId);
  });

  test.afterAll(async () => {
    await db.from('student_feature_access').delete().eq('student_id', studentId);
    await db.from('songs').delete().eq('id', songId);
  });

  test('the card is hidden from a student by default', async ({ page, loginAs }) => {
    await loginAs('student');
    await page.goto(`/dashboard/songs/${songId}`);
    await expect(page.getByRole('heading', { name: SONG_TITLE }).first()).toBeVisible();
    await expect(page.getByText(HARMONY_TITLE)).toHaveCount(0);
  });

  test('the card appears once the feature is on for that student', async ({ page, loginAs }) => {
    const { error } = await db
      .from('student_feature_access')
      .insert({ student_id: studentId, feature_key: 'song-harmony' });
    expect(error).toBeNull();

    await loginAs('student');
    await page.goto(`/dashboard/songs/${songId}`);
    await expect(page.getByText(HARMONY_TITLE)).toBeVisible();
  });
});
