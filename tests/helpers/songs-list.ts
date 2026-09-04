import { expect, type Page } from '@playwright/test';

/**
 * Readiness for `/dashboard/songs`, and the reason it is not `networkidle`.
 *
 * The songs list renders one Spotify-CDN cover per row and a page is 50 rows
 * (`SONGS_PAGE_SIZE`). Those covers are the page's own content, so the page
 * legitimately keeps fetching for a long time after it is complete and usable.
 * `page.waitForLoadState('networkidle')` waits for 500ms of total network
 * silence, which a list of 50 third-party images does not reach on demand —
 * six connections per host means nine waves, and the wait times out at 30s on a
 * page that had been interactive for 29 of them.
 *
 * This is what the 2026-09-01 nightly failed on, and the shape of it is worth
 * keeping: #766 made the row thumbs `loading="lazy"`, which fixed the symptom
 * everyone was looking at — `page.goto` no longer blocked on the covers,
 * because lazy images are excluded from the document's load-blocking set. But
 * lazy images are fetched *after* `load`, which is precisely the window
 * `networkidle` observes. The traffic did not go away; it moved out of the
 * phase that was timing out and into the next one. The device pattern inverted
 * with it: iPhone SE went green (a narrow viewport pulls few thumbs inside
 * Chromium's lazy-load threshold) and Desktop Chrome, previously clean here,
 * started failing four of these waits (a 1280x720 viewport pulls in most of
 * them).
 *
 * The list does not need `networkidle` in the first place. `/dashboard/songs`
 * is a server component: by the time `load` fires, every row is already in the
 * delivered HTML. There is no client-side fetch to wait out — only images. So
 * readiness is the page heading being on screen, and each caller's own
 * assertions do the actual verifying, as they already did.
 *
 * Use this instead of `networkidle` for any navigation to the songs list.
 */
export async function waitForSongsList(page: Page, timeout = 20_000): Promise<void> {
  await expect(page.getByRole('heading', { name: /songs/i }).first()).toBeVisible({ timeout });
}

/**
 * Submit the list's search GET form and wait for the filtered render.
 *
 * Waits on the query actually reaching the URL, which is a stricter check than
 * the `networkidle` this replaced: network silence never said whether the
 * navigation had happened, only that it had stopped happening.
 */
export async function submitSongsSearch(page: Page, query: string): Promise<void> {
  const search = page.locator('input[name="search"]').first();
  await expect(search).toBeVisible({ timeout: 15_000 });
  await search.fill(query);
  await search.press('Enter');
  await page.waitForURL((url) => url.searchParams.get('search') === query, { timeout: 20_000 });
  await waitForSongsList(page);
}
