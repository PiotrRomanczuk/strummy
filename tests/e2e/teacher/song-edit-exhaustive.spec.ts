import { test, expect } from '../../fixtures';

test.describe('Exhaustive Song Edit Test', { tag: ['@teacher', '@songs'] }, () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  test('create and edit all fields of a song', async ({ page }) => {
    test.setTimeout(120_000);
    const timestamp = Date.now();
    const TEST_SONG_TITLE = `Exhaustive Edit Test ${timestamp}`;
    const EDITED_TITLE = `${TEST_SONG_TITLE} Edited`;

    // 1. CREATE
    await page.goto('/dashboard/songs/new');
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="title"]').fill(TEST_SONG_TITLE);
    await page.locator('input[name="author"]').fill('Test Author');
    await page.getByRole('button', { name: 'Create song' }).click();

    // 2. WAIT FOR REDIRECT TO DETAIL PAGE
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    const songUrl = page.url();

    // 3. EDIT ALL FIELDS
    await page.getByRole('link', { name: 'Edit song' }).click();
    await page.waitForURL(songUrl + '/edit', { timeout: 10_000 });
    await page.waitForLoadState('networkidle');

    // Fill identity
    await page.locator('input[name="title"]').fill(EDITED_TITLE);
    await page.locator('input[name="author"]').fill('Test Author Edited');

    // Fill details
    await page.locator('input[name="capo_fret"]').fill('3');
    await page.locator('input[name="tempo"]').fill('120');
    await page.locator('input[name="time_signature"]').fill('4');
    await page.locator('input[name="release_year"]').fill('2024');

    // Fill category & external links
    await page.locator('input[name="category"]').fill('Pop');
    await page.locator('input[name="youtube_url"]').fill('https://youtube.com/watch?v=123');
    await page.locator('input[name="spotify_link_url"]').fill('https://open.spotify.com/track/123');
    await page
      .locator('input[name="ultimate_guitar_link"]')
      .fill('https://tabs.ultimate-guitar.com/tab/123');
    await page.locator('input[name="tiktok_short_url"]').fill('https://vm.tiktok.com/123');

    // Fill lyrics
    await page.locator('textarea[name="lyrics_with_chords"]').fill('Verse 1\n[C]Hello world');

    // Save changes
    await page.getByRole('button', { name: 'Save changes' }).click();

    // 4. VERIFY IT REDIRECTED AND SAVED
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expect(page).not.toHaveURL(/\/edit/);
    await expect(page.getByRole('heading', { name: EDITED_TITLE }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Check if the old title is NOT there. `exact: true` is required: the name
    // option is substring-matched by default, and EDITED_TITLE starts with
    // TEST_SONG_TITLE — so without it this matches the *edited* heading and
    // fails on a song that saved perfectly well.
    await expect(page.getByRole('heading', { name: TEST_SONG_TITLE, exact: true })).toHaveCount(0);

    // 5. CLEAN UP
    const songId = page.url().split('/').pop();
    if (songId) await page.request.delete(`/api/song?id=${songId}`);
  });
});
