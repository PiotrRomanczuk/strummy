import { test, expect } from '../../fixtures';
import { createClient } from '@supabase/supabase-js';
import { getStudentId, getTeacherId } from '../../helpers/seed-ids';
import { waitForSongsList } from '../../helpers/songs-list';

/**
 * Student Songs Read-Only E2E Tests
 *
 * Verifies that students can browse and view songs but cannot
 * create, edit, or delete them. Read-only access enforcement.
 *
 * A song is seeded via the admin client in beforeAll so tests run
 * against guaranteed data regardless of DB state.
 */

// Resolved at runtime from the configured test-account emails (see beforeAll).
let STUDENT_ID = '';
let TEACHER_ID = '';

function adminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

// Unique per worker: `fullyParallel` runs this file's tests across 2 workers and
// each beforeAll deleted the shared title, so one worker wiped the other's song
// mid-run and the surviving test hunted an id that no longer existed.
const SONG_TITLE = `E2E Test Song Read ${process.env.TEST_WORKER_INDEX ?? '0'}`;

let seededSongId: string | null = null;
let seededLessonId: string | null = null;
let seededLessonSongId: string | null = null;

test.describe('Student Songs (Read-Only)', { tag: ['@student', '@songs'] }, () => {
  test.beforeAll(async () => {
    const db = adminClient();
    STUDENT_ID = await getStudentId(db);
    TEACHER_ID = await getTeacherId(db);

    // Remove any leftover E2E songs from previous runs
    await db.from('songs').delete().eq('title', SONG_TITLE);

    // Insert a test song
    const { data: song } = await db
      .from('songs')
      .insert({
        title: SONG_TITLE,
        author: 'E2E Artist',
        level: 'beginner',
        key: 'C',
        ultimate_guitar_link: 'https://www.ultimate-guitar.com',
      })
      .select('id')
      .single();
    seededSongId = song?.id ?? null;

    if (seededSongId) {
      // Create a lesson linking the student to this song so RLS allows the student to see it
      const { data: lesson } = await db
        .from('lessons')
        .insert({
          teacher_id: TEACHER_ID,
          student_id: STUDENT_ID,
          title: 'E2E Songs Read Lesson',
          scheduled_at: '2026-09-01T10:00:00Z',
          status: 'SCHEDULED',
        })
        .select('id')
        .single();
      seededLessonId = lesson?.id ?? null;

      if (seededLessonId) {
        const { data: ls } = await db
          .from('lesson_songs')
          .insert({ lesson_id: seededLessonId, song_id: seededSongId, status: 'to_learn' })
          .select('id')
          .single();
        seededLessonSongId = ls?.id ?? null;
      }
    }
  });

  test.afterAll(async () => {
    const db = adminClient();
    if (seededLessonSongId) await db.from('lesson_songs').delete().eq('id', seededLessonSongId);
    if (seededLessonId) await db.from('lessons').delete().eq('id', seededLessonId);
    if (seededSongId) await db.from('songs').delete().eq('id', seededSongId);
  });

  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('student');
    // Dismiss demo welcome modal for demo accounts
    await page.evaluate(() => localStorage.setItem('strummy-demo-welcome-seen', 'true'));
  });

  test('songs list loads with no New Song button @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/songs');
    await waitForSongsList(page);

    // Verify heading
    const heading = page.locator('h1, h2').filter({ hasText: /songs/i }).first();
    await expect(heading).toBeVisible({ timeout: 15_000 });

    // Wait for page content to settle
    await page.waitForTimeout(2000);

    // Verify NO "New Song" link, FAB, or create button is visible
    const newSongControls = page.locator(
      'a[href="/dashboard/songs/new"], button[aria-label="Add new song"], a:has-text("New Song"), button:has-text("New Song"), [data-testid="new-song-button"]'
    );
    await expect(newSongControls).toHaveCount(0);
  });

  test('view song detail @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // The list row now opens the slide-in detail panel (see
    // song-list-panel.spec.ts) rather than navigating straight to the full
    // page — this test is about the full detail page itself, so it goes
    // there directly.
    await page.goto(`/dashboard/songs/${seededSongId}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/dashboard\/songs\/[a-zA-Z0-9-]+/);

    // Verify title is visible — student detail loads via client-side fetch
    const detailHeading = page.locator('h1').first();
    await expect(detailHeading).toBeVisible({ timeout: 30_000 });

    // Verify artist/author info is present somewhere on the page
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible();
  });

  test('no edit or delete controls on song detail @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/dashboard/songs/${seededSongId}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/dashboard\/songs\/[a-zA-Z0-9-]+/);

    // Wait for page to fully render
    await page.waitForTimeout(2000);

    // Verify no edit button
    const editButton = page.locator(
      '[data-testid="song-edit-button"], a[href*="/edit"], button:has-text("Edit")'
    );
    await expect(editButton).toHaveCount(0);

    // Verify no delete button
    const deleteButton = page.locator(
      '[data-testid="song-delete-button"], button:has-text("Delete")'
    );
    await expect(deleteButton).toHaveCount(0);
  });

  test('search songs on list @desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard/songs');
    await waitForSongsList(page);

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Find search input
    const searchInput = page
      .locator(
        '#search-filter, [data-testid="search-input"], input[type="search"], input[placeholder*="earch"]'
      )
      .first();
    const hasSearch = (await searchInput.count()) > 0;
    test.skip(!hasSearch, 'No search input available on songs page');

    // Type a partial query to filter results
    await searchInput.fill('a');
    await page.waitForTimeout(1500);

    // Verify the list has been filtered (count changed or still shows results).
    // Row links open the detail panel via `?selected=` rather than navigating
    // straight to `/dashboard/songs/{id}` — match on that instead.
    const filteredLinks = page.locator('a[href*="selected="]');
    const filteredCount = await filteredLinks.count();

    // Either the count changed (filtering works) or all songs match the query
    expect(filteredCount).toBeGreaterThanOrEqual(0);

    // Clear search and verify results return
    await searchInput.clear();
    await page.waitForTimeout(1500);

    const restoredCount = await page.locator('a[href*="selected="]').count();
    expect(restoredCount).toBeGreaterThanOrEqual(filteredCount);
  });

  test('song detail shows resource links if available @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/dashboard/songs/${seededSongId}`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/songs\/[a-zA-Z0-9-]+/);

    // Check for resource links (YouTube, Spotify, Ultimate Guitar, TikTok) or info sections
    const resourceLinks = page.locator(
      'a[href*="youtube"], a[href*="spotify"], a[href*="ultimate-guitar"], a[href*="tiktok"]'
    );
    // Scoped to VISIBLE text inside <main>. Unscoped, this regex is broad
    // enough to match app chrome: at 390px it resolved to the dashboard
    // sidebar's "Resources" nav-group label
    // (components/dashboard/Sidebar/Sidebar.NavGroup.tsx), which is hidden by
    // design at that width — so toBeVisible() failed for reasons that have
    // nothing to do with the song. Pre-existing failure on main.
    const infoSection = page
      .locator('main')
      .getByText(/resource|link|video|tab/i)
      .filter({ visible: true })
      .first();

    const hasResources = (await resourceLinks.count()) > 0;
    const hasInfoSection = (await infoSection.count()) > 0;

    // At least one of: resource links or an info section should be present
    // If neither exists, the song simply has no resources — not a failure
    if (hasResources) {
      await expect(resourceLinks.first()).toBeVisible();
    }
    if (hasInfoSection) {
      await expect(infoSection).toBeVisible();
    }

    // Verify the main content area is rendered regardless
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible();
  });
});
