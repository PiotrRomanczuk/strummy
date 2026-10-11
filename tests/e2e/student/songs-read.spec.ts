import { test, expect } from '../../fixtures';
import { adminClient, getStudentId, getTeacherId } from '../../helpers/seed-ids';
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

    // The seeded song itself, not "any h1".
    await expect(
      page.getByRole('heading', { name: SONG_TITLE }).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('E2E Artist').filter({ visible: true }).first()).toBeVisible();
  });

  test('no edit or delete controls on song detail @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/dashboard/songs/${seededSongId}`);
    await page.waitForLoadState('domcontentloaded');

    await expect(page).toHaveURL(/\/dashboard\/songs\/[a-zA-Z0-9-]+/);

    // Wait for page to fully render
    await page.waitForTimeout(2000);

    await expect(page.getByRole('heading', { name: SONG_TITLE }).first()).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('a[href*="/edit"]')).toHaveCount(0);
    // Role + name also catches icon-only buttons that carry just an aria-label.
    await expect(page.getByRole('button', { name: /edit|delete/i })).toHaveCount(0);
  });

  test('search narrows the list to the matching song @desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/dashboard/songs');
    await waitForSongsList(page);

    // The list's own title filter — not the top bar's global search, which an
    // `input[placeholder*="earch"]` selector used to pick up instead.
    const searchInput = page.locator('main').getByPlaceholder(/search by title/i);
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    const seededRow = page.locator(`a[href*="selected=${seededSongId}"]`).first();

    await searchInput.fill(SONG_TITLE);
    await expect(seededRow).toBeVisible({ timeout: 15_000 });

    await searchInput.fill('zz-no-song-matches-this-zz');
    await expect(page.locator(`a[href*="selected=${seededSongId}"]`)).toHaveCount(0, {
      timeout: 15_000,
    });
  });

  test('song detail shows the seeded Ultimate Guitar link @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/dashboard/songs/${seededSongId}`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('main a[href*="ultimate-guitar.com"]').filter({ visible: true }).first()
    ).toBeVisible({ timeout: 20_000 });
  });
});
