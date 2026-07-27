import { test, expect } from '../../fixtures';

/**
 * A3.2 — song external resource links (YouTube / Ultimate Guitar / Spotify /
 * TikTok). Teachers attach them in the create form; they persist and the page
 * query selects them, but nothing rendered them until the Resources card was
 * added — so this proves create → save → shown-on-detail end to end.
 */
const ts = Date.now();
const TITLE = `E2E Song ${ts}`; // matches global-teardown cleanup pattern
const YT = `https://youtube.com/watch?v=e2e-${ts}`;
const UG = `https://tabs.ultimate-guitar.com/e2e-${ts}`;

test.describe('Song external links', { tag: ['@teacher', '@songs'] }, () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  test('create a song with YouTube + Ultimate Guitar links → shown on detail', async ({ page }) => {
    test.setTimeout(120_000);

    await page.goto('/dashboard/songs/new');
    await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 15_000 });

    await page.locator('input[name="title"]').fill(TITLE);
    await page.locator('input[name="author"]').fill('E2E Test Artist'); // teardown-matched
    await page.locator('input[name="youtube_url"]').fill(YT);
    await page.locator('input[name="ultimate_guitar_link"]').fill(UG);

    await page.getByRole('button', { name: 'Create song' }).click();
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: TITLE }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Resources card renders the two links with their hrefs; absent ones don't show.
    await expect(page.getByText('Resources').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /YouTube/ })).toHaveAttribute('href', YT);
    await expect(page.getByRole('link', { name: /Ultimate Guitar/ })).toHaveAttribute('href', UG);
    await expect(page.getByRole('link', { name: /Spotify/ })).toHaveCount(0);
    // Cleanup via global-teardown (title "E2E Song N" + artist "E2E Test Artist").
  });
});
