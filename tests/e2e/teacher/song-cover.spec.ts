import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';
import { pickSongLevel } from '../../helpers/song-form';

/**
 * Wave feature: manual song cover image (migration 20260723000001 storage
 * bucket + cover_image_url). Proves the create form's cover URL persists.
 * cover_image_url is only rendered via next/image (remote-host constrained),
 * so we assert persistence at the DB layer via the service-role client rather
 * than a fragile image-load check.
 */
const ts = Date.now();
const TITLE = `E2E Song ${ts}`; // matches global-teardown cleanup pattern
// picsum.photos is allow-listed in next.config images.remotePatterns, so the
// detail page's next/image render doesn't crash on an unconfigured host.
const COVER_URL = `https://picsum.photos/seed/e2e-${ts}/200/200`;

test.describe('Song cover image', { tag: ['@teacher', '@songs'] }, () => {
  // These drive the desktop song form ("Create song" header button, cover URL
  // field); phones get the step wizard, covered in songs-crud.
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  test('create a song with a cover URL → persists to cover_image_url', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('/dashboard/songs/new');
    await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 15_000 });

    await page.locator('input[name="title"]').fill(TITLE);
    await page.locator('input[name="author"]').fill('E2E Test Artist'); // teardown-matched
    await pickSongLevel(page);
    await page.getByLabel('Cover image URL').fill(COVER_URL);

    await page.getByRole('button', { name: 'Create song' }).click();
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: TITLE }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Assert the cover persisted (no reliable post-create UI surface for the URL).
    const db = adminClient();
    const { data, error } = await db
      .from('songs')
      .select('cover_image_url')
      .eq('title', TITLE)
      .single();
    expect(error, 'songs query').toBeNull();
    expect(data?.cover_image_url).toBe(COVER_URL);
  });

  // Not left to global teardown: the prod config has none, and a failed run
  // would otherwise leave this song in the catalog every teacher sees.
  test.afterAll(async () => {
    await adminClient().from('songs').delete().eq('title', TITLE);
  });
});
