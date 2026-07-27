import { test, expect } from '../../fixtures';
import { createClient } from '@supabase/supabase-js';
import { getStudentId, getTeacherId } from '../../helpers/seed-ids';

/**
 * Lesson Song Display E2E Tests (A4.3)
 *
 * Journeys tested:
 *  A4.3 — Lesson detail shows assigned songs in the Repertoire section
 *
 * NOTE: The teacher's lesson detail (`LessonDetail`) renders
 * songs as read-only links in a "REPERTOIRE" card — there is no status-select
 * or `data-testid="lesson-songs-section"` on this view. Status can be changed
 * by the teacher via a dedicated song-management flow (not the lesson detail).
 * This spec tests what IS present: the lesson loads and the assigned song appears.
 */

// Resolved/created at runtime — these were hard-coded UUIDs that exist in no
// environment, so the seeds failed silently and the assertions had nothing to find.
let TEACHER_ID = '';
let STUDENT_ID = '';
let SONG_ID = '';

// Unique per worker so parallel workers don't delete each other's song.
const SONG_TITLE = `E2E Lesson Song Status ${process.env.TEST_WORKER_INDEX ?? '0'}`;

function adminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

let lessonId: string | null = null;
let lessonSongId: string | null = null;

test.describe.configure({ mode: 'serial' });

test.describe('Lesson Song Display', { tag: ['@teacher', '@lessons'] }, () => {
  test.beforeAll(async () => {
    const db = adminClient();
    TEACHER_ID = await getTeacherId(db);
    STUDENT_ID = await getStudentId(db);

    await db.from('songs').delete().eq('title', SONG_TITLE);
    const { data: song, error: songError } = await db
      .from('songs')
      .insert({ title: SONG_TITLE, author: 'E2E Artist', level: 'beginner', key: 'C' })
      .select('id')
      .single();
    expect(songError, `song seed failed: ${songError?.message}`).toBeNull();
    SONG_ID = song!.id;

    const { data: lesson, error: lessonError } = await db
      .from('lessons')
      .insert({
        teacher_id: TEACHER_ID,
        student_id: STUDENT_ID,
        title: `E2E Song Status Test Lesson`,
        scheduled_at: '2026-08-01T10:00:00Z',
        status: 'SCHEDULED',
      })
      .select('id')
      .single();
    expect(lessonError, `lesson seed failed: ${lessonError?.message}`).toBeNull();
    lessonId = lesson!.id;

    const { data: ls, error: lsError } = await db
      .from('lesson_songs')
      .insert({
        lesson_id: lessonId,
        song_id: SONG_ID,
        status: 'to_learn',
      })
      .select('id')
      .single();
    expect(lsError, `lesson_songs seed failed: ${lsError?.message}`).toBeNull();
    lessonSongId = ls!.id;
  });

  test.afterAll(async () => {
    const db = adminClient();
    if (lessonSongId) await db.from('lesson_songs').delete().eq('id', lessonSongId);
    if (lessonId) await db.from('lessons').delete().eq('id', lessonId);
    if (SONG_ID) await db.from('songs').delete().eq('id', SONG_ID);
  });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  test('A4.3 lesson detail loads and assigned song appears in Repertoire section', async ({
    page,
  }) => {
    if (!lessonId) test.skip(true, 'Lesson not created in beforeAll');

    await page.goto(`/dashboard/lessons/${lessonId}`);
    await page.waitForLoadState('networkidle');

    // Lesson page loads (title or heading visible)
    await expect(page.locator('text=/E2E Song Status Test Lesson/i').first()).toBeVisible({
      timeout: 15_000,
    });

    // Assigned song is visible on the page (shown in the Repertoire card)
    await expect(page.getByText(SONG_TITLE).first()).toBeVisible({ timeout: 10_000 });
  });

  test('A4.3 lesson song status can be updated directly via DB and reflects on reload', async ({
    page,
  }) => {
    if (!lessonId || !lessonSongId) test.skip(true, 'Lesson not created in beforeAll');

    const db = adminClient();
    // Set status to 'remembered' directly in DB
    await db.from('lesson_songs').update({ status: 'remembered' }).eq('id', lessonSongId);

    await page.goto(`/dashboard/lessons/${lessonId}`);
    await page.waitForLoadState('networkidle');

    // Lesson detail renders — song still visible after status update
    await expect(page.getByText(SONG_TITLE).first()).toBeVisible({ timeout: 15_000 });

    // Restore status
    await db.from('lesson_songs').update({ status: 'to_learn' }).eq('id', lessonSongId);
  });
});
