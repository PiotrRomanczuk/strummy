import { test, expect } from '../../fixtures';
import { waitForSongsList } from '../../helpers/songs-list';

/**
 * Songs list slide-in detail panel + category tabs + sortable columns.
 *
 * Replaces the row's old inline "expand chevron" (see git history) — a row
 * click now opens a right-side panel with the same musical detail plus usage
 * stats and the currently-learning list, without leaving `/dashboard/songs`.
 * See `components/songs/SongsList.Panel.tsx` / `.Row.tsx` / `.Header.tsx` /
 * `.CategoryTabs.tsx`.
 */
test.describe('Songs List Panel', { tag: ['@teacher', '@songs'] }, () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  test('row click opens the panel; open-full-page and close both work', async ({ page }) => {
    test.setTimeout(120_000);
    const timestamp = Date.now();
    const TITLE = `Panel Test ${timestamp}`;

    await page.goto('/dashboard/songs/new');
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="title"]').fill(TITLE);
    await page.locator('input[name="author"]').fill('Test Author');
    await page.getByRole('button', { name: 'Create song' }).click();
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    const songUrl = page.url();
    const songId = songUrl.split('/').pop();

    await page.getByRole('link', { name: 'Edit song' }).click();
    await page.waitForURL(songUrl + '/edit', { timeout: 20_000 });
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="capo_fret"]').fill('3');
    await page.locator('input[name="tempo"]').fill('120');
    await page.locator('input[name="category"]').fill('Pop');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    try {
      await page.goto(`/dashboard/songs?search=${encodeURIComponent(TITLE)}`);
      await page.waitForLoadState('networkidle');

      const rowLink = page.getByRole('link', { name: TITLE }).first();
      await expect(rowLink).toBeVisible({ timeout: 15_000 });

      // Panel is closed until a row is clicked.
      await expect(page).not.toHaveURL(/selected=/);
      await rowLink.click();
      await page.waitForURL(new RegExp(`selected=${songId}`), { timeout: 10_000 });

      // Panel shows the values entered above. Scoped to the panel (labelled
      // "Song detail: <title>") — "Pop" also appears in the category tab
      // strip, which would make an unscoped locator ambiguous, and the
      // dashboard sidebar nav is also a "complementary" landmark.
      const panel = page.getByRole('complementary', { name: `Song detail: ${TITLE}` });
      await expect(panel.getByText('120 BPM')).toBeVisible({ timeout: 10_000 });
      await expect(panel.getByText('fret 3')).toBeVisible();
      // "Pop" appears twice inside the panel: the category/year eyebrow line
      // and the tag chip below it — either confirms the category saved.
      await expect(panel.getByText('Pop').first()).toBeVisible();

      // "Open full page" leaves the list for the real detail page.
      await panel.getByRole('link', { name: 'Open full page' }).click();
      await page.waitForURL(songUrl, { timeout: 10_000 });

      // Back on the list with the panel open, the close control clears it.
      await page.goto(`/dashboard/songs?search=${encodeURIComponent(TITLE)}&selected=${songId}`);
      await page.waitForLoadState('networkidle');
      await page.getByRole('link', { name: 'Close' }).click();
      await page.waitForURL((url) => !url.search.includes('selected='), { timeout: 10_000 });
    } finally {
      if (songId) await page.request.delete(`/api/song?id=${songId}`);
    }
  });

  test('category tab filters the list to that category', async ({ page }) => {
    test.setTimeout(120_000);
    const timestamp = Date.now();
    const TITLE = `Category Tab Test ${timestamp}`;
    const CATEGORY = `E2ECat${timestamp}`;

    await page.goto('/dashboard/songs/new');
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="title"]').fill(TITLE);
    await page.locator('input[name="author"]').fill('Test Author');
    await page.getByRole('button', { name: 'Create song' }).click();
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    const songUrl = page.url();
    const songId = songUrl.split('/').pop();

    await page.getByRole('link', { name: 'Edit song' }).click();
    await page.waitForURL(songUrl + '/edit', { timeout: 20_000 });
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="category"]').fill(CATEGORY);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });

    try {
      await page.goto('/dashboard/songs');
      await waitForSongsList(page);

      const tab = page.getByRole('tab', { name: new RegExp(CATEGORY) });
      await expect(tab).toBeVisible({ timeout: 15_000 });
      await tab.click();
      await page.waitForURL(new RegExp(`category=${CATEGORY}`), { timeout: 10_000 });

      await expect(page.getByRole('link', { name: TITLE }).first()).toBeVisible({
        timeout: 10_000,
      });
    } finally {
      if (songId) await page.request.delete(`/api/song?id=${songId}`);
    }
  });
});
