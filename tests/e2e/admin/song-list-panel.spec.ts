import { test, expect } from '../../fixtures';
import { createClient } from '@supabase/supabase-js';

/**
 * Admin POV of the songs list slide-in panel — admins share the teacher's
 * list view (`canCreate = isTeacher || isAdmin`), so this just confirms the
 * panel opens and offers management links rather than re-testing every field
 * already covered by tests/e2e/teacher/song-list-panel.spec.ts.
 */

function adminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

const SONG_TITLE = `E2E Panel Admin Song ${process.env.TEST_WORKER_INDEX ?? '0'}`;
let seededSongId: string | null = null;

test.describe('Songs List Panel (admin)', { tag: ['@admin', '@songs'] }, () => {
  test.beforeAll(async () => {
    const db = adminClient();
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
    await loginAs('admin');
  });

  test('row click opens the panel with an edit link, no want-to-learn control', async ({
    page,
  }) => {
    await page.goto(`/dashboard/songs?search=${encodeURIComponent(SONG_TITLE)}`);
    await page.waitForLoadState('networkidle');

    const rowLink = page.getByRole('link', { name: SONG_TITLE }).first();
    await expect(rowLink).toBeVisible({ timeout: 15_000 });
    await rowLink.click();
    await page.waitForURL(new RegExp(`selected=${seededSongId}`), { timeout: 10_000 });

    await page.getByRole('link', { name: 'Open full page' }).click();
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 10_000 });
    await expect(page.getByRole('link', { name: 'Edit song' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /want to learn/i })).toHaveCount(0);
  });
});
