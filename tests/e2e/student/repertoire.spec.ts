import { test, expect } from '../../fixtures';
import { createClient } from '@supabase/supabase-js';
import { getStudentId, getTeacherId } from '../../helpers/seed-ids';

/**
 * Student Repertoire E2E Tests (B7)
 *
 * Journeys tested:
 *  B7.1 — View own repertoire (empty state + with entries)
 *  B7.2 — Update own self-rating / difficulty
 *  B7.3 — No add/remove controls (teacher-managed set)
 */

// Resolved/created at runtime. These were hard-coded UUIDs that no longer exist
// in any environment, so every insert below failed silently (errors unchecked)
// and the assertions looked at an empty repertoire.
let STUDENT_ID = '';
let TEACHER_ID = '';
let SONG_ID = '';

// Unique per worker: `fullyParallel` runs specs in 2 workers, and a shared
// title plus a delete-by-title in beforeAll made workers clobber each other.
const SONG_TITLE = `E2E Repertoire Song ${process.env.TEST_WORKER_INDEX ?? '0'}`;

function adminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

let repertoireEntryId: string | null = null;
let lessonId: string | null = null;
let lessonSongId: string | null = null;

test.describe.configure({ mode: 'serial' });

test.describe('Student Repertoire', { tag: ['@student', '@repertoire'] }, () => {
  test.beforeAll(async () => {
    const db = adminClient();
    STUDENT_ID = await getStudentId(db);
    TEACHER_ID = await getTeacherId(db);

    // Own the song outright rather than depending on a fixture row that may or
    // may not exist in this environment.
    await db.from('songs').delete().eq('title', SONG_TITLE);
    const { data: song, error: songError } = await db
      .from('songs')
      .insert({ title: SONG_TITLE, author: 'E2E Artist', level: 'beginner', key: 'C' })
      .select('id')
      .single();
    expect(songError, `song seed failed: ${songError?.message}`).toBeNull();
    SONG_ID = song!.id;

    // Create a lesson so songs RLS allows the student to see the song
    // (songs_select_policy requires lesson_songs → lessons link for students)
    const { data: lesson, error: lessonError } = await db
      .from('lessons')
      .insert({
        teacher_id: TEACHER_ID,
        student_id: STUDENT_ID,
        title: 'E2E Repertoire Lesson',
        scheduled_at: '2026-08-15T10:00:00Z',
        status: 'SCHEDULED',
      })
      .select('id')
      .single();
    expect(lessonError, `lesson seed failed: ${lessonError?.message}`).toBeNull();
    lessonId = lesson!.id;

    const { data: ls, error: lsError } = await db
      .from('lesson_songs')
      .insert({ lesson_id: lessonId, song_id: SONG_ID, status: 'to_learn' })
      .select('id')
      .single();
    expect(lsError, `lesson_songs seed failed: ${lsError?.message}`).toBeNull();
    lessonSongId = ls!.id;

    // Ensure no leftover repertoire entry for this student+song combo
    await db
      .from('student_repertoire')
      .delete()
      .eq('student_id', STUDENT_ID)
      .eq('song_id', SONG_ID);

    const { data, error: repError } = await db
      .from('student_repertoire')
      .insert({
        student_id: STUDENT_ID,
        song_id: SONG_ID,
        current_status: 'to_learn',
      })
      .select('id')
      .single();
    expect(repError, `student_repertoire seed failed: ${repError?.message}`).toBeNull();
    repertoireEntryId = data!.id;
  });

  test.afterAll(async () => {
    const db = adminClient();
    if (lessonSongId) await db.from('lesson_songs').delete().eq('id', lessonSongId);
    if (lessonId) await db.from('lessons').delete().eq('id', lessonId);
    if (repertoireEntryId) {
      await db.from('student_repertoire').delete().eq('id', repertoireEntryId);
    }
    if (SONG_ID) await db.from('songs').delete().eq('id', SONG_ID);
  });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('student');
  });

  test('B7.1 view own repertoire with seeded entry', async ({ page }) => {
    await page.goto('/dashboard/repertoire');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /repertoire/i })).toBeVisible({
      timeout: 15_000,
    });
    // The seeded song should appear
    await expect(page.getByText(SONG_TITLE).first()).toBeVisible({ timeout: 10_000 });
    // Status badge shows (to_learn → "To learn")
    await expect(page.locator('text=/To learn/i').first()).toBeVisible({ timeout: 5_000 });
  });

  // The row is compact until its notes toggle is opened — the editor is no
  // longer mounted on every row, which is what made 31 songs unreadable.
  test('B7.2 update own difficulty self-rating', async ({ page }) => {
    await page.goto('/dashboard/repertoire');
    await page.waitForLoadState('networkidle');

    const row = page.locator('.ui-row', { hasText: SONG_TITLE }).first();
    await expect(row).toBeVisible({ timeout: 10_000 });

    // Collapsed by default: no editor until the toggle is used. Targeted by
    // the difficulty control's own aria-label — a bare name of '3' also
    // substring-matches a stage chip's count.
    const difficulty3 = page.getByRole('button', { name: 'Set difficulty to 3' });
    await expect(difficulty3).toHaveCount(0);

    await row.getByRole('button', { name: new RegExp(SONG_TITLE, 'i') }).click();

    await difficulty3.click();
    await page.getByRole('button', { name: 'Save' }).first().click();
    await expect(page.locator('text=/Saved/i').first()).toBeVisible({ timeout: 8_000 });

    // Reload, reopen, and verify the rating persisted.
    await page.reload();
    await page.waitForLoadState('networkidle');
    const reloaded = page.locator('.ui-row', { hasText: SONG_TITLE }).first();
    await reloaded.getByRole('button', { name: new RegExp(SONG_TITLE, 'i') }).click();
    await expect(page.getByRole('button', { name: 'Set difficulty to 3' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  test('B7.4 renders as a scannable table, not a stack of editors', async ({ page }) => {
    await page.goto('/dashboard/repertoire');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(SONG_TITLE).first()).toBeVisible({ timeout: 10_000 });

    // Column headers from the shared DataList primitive. Scoped to the header
    // strip: "Stage" is also a filter label and a sort chip on this page.
    const header = page.locator('.ui-datalist-grid.ui-datalist-desktop').first();
    await expect(header.getByText('Stage', { exact: true })).toBeVisible();
    await expect(header.getByText('Last practised', { exact: true })).toBeVisible();

    // No textarea is mounted until a row is expanded.
    await expect(page.locator('textarea')).toHaveCount(0);
  });

  // Filters are links, so they must survive a reload and be shareable as URLs
  // — that is why chips are anchors rather than client-router pushes.
  test('B7.5 stage chip filters the table and is reflected in the URL', async ({ page }) => {
    await page.goto('/dashboard/repertoire');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(SONG_TITLE).first()).toBeVisible({ timeout: 10_000 });

    await page.locator('a[role="button"][href*="stage=mastered"]').click();
    await page.waitForURL(/stage=mastered/, { timeout: 10_000 });

    // The seeded song is to_learn, so filtering to mastered must hide it.
    await expect(page.getByText(SONG_TITLE)).toHaveCount(0);

    // Clicking the active chip again clears the filter rather than trapping you.
    await page.locator('a[role="button"][href="/dashboard/repertoire"]').first().click();
    await page.waitForURL((u) => !u.search.includes('stage='), { timeout: 10_000 });
    await expect(page.getByText(SONG_TITLE).first()).toBeVisible({ timeout: 10_000 });
  });

  test('B7.6 search narrows the table by title', async ({ page }) => {
    await page.goto(`/dashboard/repertoire?search=${encodeURIComponent(SONG_TITLE)}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(SONG_TITLE).first()).toBeVisible({ timeout: 10_000 });

    await page.goto('/dashboard/repertoire?search=zzzznomatch');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(SONG_TITLE)).toHaveCount(0);
    await expect(page.getByText(/No songs match these filters/i)).toBeVisible();
  });

  test('B7.3 no add/remove song controls for student', async ({ page }) => {
    await page.goto('/dashboard/repertoire');
    await page.waitForLoadState('networkidle');

    // Student should NOT see "Add song" / "Remove" / "Delete" buttons
    await expect(page.getByRole('button', { name: /add song/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /remove/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /delete/i })).not.toBeVisible();
  });
});
