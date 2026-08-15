import { test, expect } from '../../fixtures';
import { createClient } from '@supabase/supabase-js';
import { getStudentId } from '../../helpers/seed-ids';

/**
 * Student POV of the songs list slide-in panel (see
 * tests/e2e/teacher/song-list-panel.spec.ts for the teacher/create flow).
 * Students get read-only detail plus the "want to learn" control inside the
 * panel — the same control the row's compact action cell offers, per
 * `components/songs/SongsList.Panel.tsx`.
 */

function adminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

const SONG_TITLE = `E2E Panel Student Song ${process.env.TEST_WORKER_INDEX ?? '0'}`;
let seededSongId: string | null = null;

test.describe('Songs List Panel (student)', { tag: ['@student', '@songs'] }, () => {
  test.beforeAll(async () => {
    const db = adminClient();
    await getStudentId(db);
    await db.from('songs').delete().eq('title', SONG_TITLE);
    const { data: song } = await db
      .from('songs')
      .insert({ title: SONG_TITLE, author: 'E2E Artist', level: 'beginner', key: 'C' })
      .select('id')
      .single();
    seededSongId = song?.id ?? null;
  });

  test.afterAll(async () => {
    const db = adminClient();
    if (seededSongId) await db.from('songs').delete().eq('id', seededSongId);
  });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('student');
  });

  test('row click opens the panel with a want-to-learn control, no edit link', async ({ page }) => {
    await page.goto(`/dashboard/songs?search=${encodeURIComponent(SONG_TITLE)}`);
    await page.waitForLoadState('networkidle');

    const rowLink = page.getByRole('link', { name: SONG_TITLE }).first();
    await expect(rowLink).toBeVisible({ timeout: 15_000 });
    await rowLink.click();
    await page.waitForURL(new RegExp(`selected=${seededSongId}`), { timeout: 10_000 });

    // Scoped to the panel (labelled "Song detail: <title>") — the row
    // behind it keeps its own compact "Want to learn" action, and the
    // dashboard sidebar nav is also a "complementary" landmark, so an
    // unscoped locator would match more than one element.
    const panel = page.getByRole('complementary', { name: `Song detail: ${SONG_TITLE}` });
    await expect(panel.getByRole('link', { name: 'Open full page' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(panel.getByRole('button', { name: /want to learn/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit song' })).toHaveCount(0);
  });
});
