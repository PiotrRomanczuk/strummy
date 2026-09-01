import { test, expect } from '../../fixtures';
import { submitSongsSearch } from '../../helpers/songs-list';

/**
 * Teacher Songs CRUD E2E Tests
 *
 * Tests the complete song lifecycle for a teacher:
 * list, create, view detail, edit, search, delete.
 *
 * Targets the UI:
 *  - List `SongsList` — server-rendered GET form, search submits on Enter.
 *  - Create `SongForm` — single-page form (`name=` fields, level/key
 *    selects default to beginner/C), submit "Add song", redirects to the new
 *    song's detail page (`/dashboard/songs/[id]`).
 *  - Edit `SongEditForm` — same shape, submit "Save changes".
 */

const timestamp = Date.now();
const TEST_SONG_TITLE = `E2E Song ${timestamp}`;
const TEST_SONG_EDITED = `E2E Song ${timestamp} Edited`;

test.describe('Teacher Songs CRUD', { tag: ['@teacher', '@songs'] }, () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  test('songs list loads with heading and New Song button @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/songs');
    // No `networkidle` here — see `waitForSongsList`. This test's own heading
    // assertion is the readiness check, so it stands in for the helper.
    await expect(page.getByRole('heading', { name: /songs/i }).first()).toBeVisible({
      timeout: 15_000,
    });

    // At least one song row links open the detail panel via `?selected=`
    // (SongsList.Row.tsx) rather than navigating straight to `/dashboard/songs/{id}`.
    await expect(page.locator('a[href*="selected="]').first()).toBeVisible({
      timeout: 15_000,
    });

    // New Song affordance.
    await expect(page.locator('a[href="/dashboard/songs/new"]').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test('song CRUD lifecycle: create → view → edit → search → delete', async ({ page }) => {
    test.setTimeout(120_000);

    // ── CREATE ───────────────────────────────────────────────────
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/songs/new');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 15_000 });
    await page.locator('input[name="title"]').fill(TEST_SONG_TITLE);
    await page.locator('input[name="author"]').fill('E2E Test Artist');
    // level/key selects default to beginner/C (both required) — leave as-is.
    await page.getByRole('button', { name: 'Create song' }).click();

    // Server action redirects to the new song's detail page.
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    const songUrl = page.url();

    // ── VIEW DETAIL ──────────────────────────────────────────────
    await expect(page.getByRole('heading', { name: TEST_SONG_TITLE }).first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText('E2E Test Artist').first()).toBeVisible();

    // ── EDIT ─────────────────────────────────────────────────────
    await page.getByRole('link', { name: 'Edit song' }).click();
    await page.waitForURL(songUrl + '/edit', { timeout: 10_000 });
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 10_000 });
    await page.locator('input[name="title"]').fill(TEST_SONG_EDITED);
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expect(page).not.toHaveURL(/\/edit/);
    await expect(page.getByRole('heading', { name: TEST_SONG_EDITED }).first()).toBeVisible({
      timeout: 10_000,
    });

    // ── SEARCH (list GET form) ───────────────────────────────────
    // Match by ACCESSIBLE NAME, not link text. A song row is a stretched empty
    // <Link> carrying only `aria-label={title}` (SongsList.Row.tsx) — the visible
    // title sits in a sibling cell — so `a:has-text(title)` matches nothing.
    await page.goto('/dashboard/songs');
    await submitSongsSearch(page, TEST_SONG_EDITED);
    const editedLink = page.getByRole('link', { name: TEST_SONG_EDITED }).first();
    await expect(editedLink).toBeVisible({ timeout: 10_000 });

    // Row click opens the slide-in detail panel via `?selected=<id>`
    // (replaces the old direct navigation to `/dashboard/songs/{id}`). The
    // panel is a lighter preview with no edit/delete actions — those only
    // live on the full detail page, reached via "Open full page".
    await editedLink.click();
    await page.waitForURL(/selected=/, { timeout: 10_000 });
    const songId = new URL(page.url()).searchParams.get('selected');
    expect(songId).toBeTruthy();

    // ── DELETE (through the UI — full page's "Delete song" button + confirm) ──
    await page.getByRole('link', { name: 'Open full page' }).click();
    await page.waitForURL(new RegExp(`/dashboard/songs/${songId}$`), { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: TEST_SONG_EDITED }).first()).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('button', { name: 'Delete song' }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    // Two "Delete song" buttons exist once the dialog is open (the page's
    // trigger button plus the dialog's confirm action) — scope to the dialog.
    await dialog.getByRole('button', { name: 'Delete song' }).click();

    // Server action redirects to the songs list on success.
    await page.waitForURL(/\/dashboard\/songs(\?.*)?$/, { timeout: 15_000 });

    await page.goto('/dashboard/songs');
    await submitSongsSearch(page, TEST_SONG_EDITED);
    // Same accessible-name locator as above. With the old `a:has-text(...)` this
    // assertion was vacuous — it matched nothing whether or not the delete
    // worked, so it passed for the wrong reason.
    await expect(page.getByRole('link', { name: TEST_SONG_EDITED })).toHaveCount(0, {
      timeout: 10_000,
    });
  });

  test('create song with required fields @mobile', async ({ page }) => {
    test.setTimeout(90_000);
    const fullTitle = `E2E Full Song ${timestamp}`;

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/songs/new');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('input[name="title"]')).toBeVisible({ timeout: 15_000 });
    await page.locator('input[name="title"]').fill(fullTitle);
    await page.locator('input[name="author"]').fill('E2E Full Artist');
    await page.getByRole('button', { name: 'Create song' }).click();

    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expect(page.getByRole('heading', { name: fullTitle }).first()).toBeVisible({
      timeout: 10_000,
    });

    // Clean up via API.
    const songId = page.url().split('/').pop();
    if (songId) await page.request.delete(`/api/song?id=${songId}`);
  });
});
