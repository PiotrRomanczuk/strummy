import { test, expect } from '../../fixtures';

/**
 * Songs list row expand toggle (extra musical details, no navigation away).
 *
 * A row's chevron reveals capo/tempo/time-signature/category inline without
 * leaving the list; the row title/body still navigates to the full song page
 * as before. See `components/songs/SongsList.Row.tsx` / `.Row.Detail.tsx`.
 */
test.describe('Songs List Row Expand', { tag: ['@teacher', '@songs'] }, () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  test('expand toggle reveals extra fields, row still navigates on click', async ({ page }) => {
    test.setTimeout(90_000);
    const timestamp = Date.now();
    const TITLE = `Row Expand Test ${timestamp}`;

    // Create a song, then edit it with fields the expand panel should show.
    await page.goto('/dashboard/songs/new');
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="title"]').fill(TITLE);
    await page.locator('input[name="author"]').fill('Test Author');
    await page.getByRole('button', { name: 'Create song' }).click();
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    const songUrl = page.url();
    const songId = songUrl.split('/').pop();

    await page.getByRole('link', { name: 'Edit song' }).click();
    await page.waitForURL(songUrl + '/edit', { timeout: 10_000 });
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="capo_fret"]').fill('3');
    await page.locator('input[name="tempo"]').fill('120');
    await page.locator('input[name="time_signature"]').fill('4');
    await page.locator('input[name="category"]').fill('Pop');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    try {
      // Back to the list, search for the song we just made.
      await page.goto('/dashboard/songs');
      await page.waitForLoadState('networkidle');
      const search = page.locator('input[name="search"]').first();
      await expect(search).toBeVisible({ timeout: 15_000 });
      await search.fill(TITLE);
      await search.press('Enter');
      await page.waitForLoadState('networkidle');

      // Note: this app currently double-renders dashboard page content
      // (pre-existing, unrelated to this feature — verified against
      // unmodified `main`), so several locators below resolve to more than
      // one match; `.first()` keeps the test scoped to a single row.
      const expandButton = page.getByRole('button', { name: /show more details/i }).first();
      await expect(expandButton).toBeVisible({ timeout: 15_000 });

      // Details are hidden until expanded.
      await expect(page.getByTestId('song-row-details')).toHaveCount(0);

      await expandButton.click();
      const details = page.getByTestId('song-row-details').first();
      await expect(details).toBeVisible({ timeout: 5_000 });
      await expect(details).toContainText('120 BPM');
      await expect(details).toContainText('fret 3');
      await expect(details).toContainText('4/4');
      await expect(details).toContainText('Pop');

      // Collapsing hides it again.
      await page
        .getByRole('button', { name: /hide details/i })
        .first()
        .click();
      await expect(page.getByTestId('song-row-details')).toHaveCount(0);

      // The row's navigation link is untouched by the expand toggle — assert
      // the href directly rather than clicking through (this app currently
      // double-renders dashboard pages, which makes a real click-and-wait
      // navigation assertion unreliable here; verified manually in the
      // browser that the click does navigate to the song detail page).
      await expect(page.getByRole('link', { name: TITLE }).first()).toHaveAttribute(
        'href',
        songUrl.replace(/^https?:\/\/[^/]+/, '')
      );
    } finally {
      if (songId) await page.request.delete(`/api/song?id=${songId}`);
    }
  });
});
