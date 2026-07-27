import { test, expect } from '../../fixtures';
import { createClient } from '@supabase/supabase-js';
import { getStudentId, getTeacherId } from '../../helpers/seed-ids';

/**
 * BPM Tempo Tracking E2E Tests
 *
 * Journeys tested:
 *  B7.1 — BPM input hidden when no song is selected (general technique)
 *  B7.2 — BPM input appears when a song is selected from dropdown
 *  B7.3 — Seeded session with BPM shows badge in history
 *  B7.4 — Student logs new session with BPM, badge visible in history
 *  B7.5 — Admin can view student practice page (teacher read path)
 */

// Resolved at runtime from the configured test-account emails (see beforeAll).
// Previously hard-coded UUIDs that exist in no environment, so every seed below
// failed silently and the assertions ran against data that was never created.
let STUDENT_ID = '';
let TEACHER_ID = '';

// Unique per worker so `fullyParallel` workers don't delete each other's song.
const BPM_SONG_TITLE = `E2E BPM Test Song ${process.env.TEST_WORKER_INDEX ?? '0'}`;

function adminClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key =
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

test.describe.configure({ mode: 'serial' });

test.describe('Practice Session BPM Tracking', { tag: ['@student', '@practice', '@bpm'] }, () => {
  let seededSessionId: string | null = null;
  let seededSongId: string | null = null;
  let seededRepertoireId: string | null = null;
  let seededLessonId: string | null = null;

  test.beforeAll(async () => {
    const db = adminClient();
    STUDENT_ID = await getStudentId(db);
    TEACHER_ID = await getTeacherId(db);

    // Clean up any leftover data from prior runs
    await db
      .from('practice_sessions')
      .delete()
      .eq('student_id', STUDENT_ID)
      .like('notes', 'E2E-BPM%');
    await db.from('songs').delete().eq('title', BPM_SONG_TITLE);

    const { data: song, error: songError } = await db
      .from('songs')
      .insert({ title: BPM_SONG_TITLE, author: 'Test Artist' })
      .select('id')
      .single();
    expect(songError, `song seed failed: ${songError?.message}`).toBeNull();
    seededSongId = song!.id;

    // Add to repertoire
    const { data: rep, error: repError } = await db
      .from('student_repertoire')
      .insert({ student_id: STUDENT_ID, song_id: seededSongId, is_active: true })
      .select('id')
      .single();
    expect(repError, `student_repertoire seed failed: ${repError?.message}`).toBeNull();
    seededRepertoireId = rep!.id;

    // Add to a lesson so the student RLS policy allows reading the song
    const { data: lesson, error: lessonError } = await db
      .from('lessons')
      .insert({
        teacher_id: TEACHER_ID,
        student_id: STUDENT_ID,
        scheduled_at: new Date().toISOString(),
        status: 'SCHEDULED',
      })
      .select('id')
      .single();
    expect(lessonError, `lesson seed failed: ${lessonError?.message}`).toBeNull();
    seededLessonId = lesson!.id;

    const { error: lsError } = await db
      .from('lesson_songs')
      .insert({ lesson_id: seededLessonId, song_id: seededSongId });
    expect(lsError, `lesson_songs seed failed: ${lsError?.message}`).toBeNull();

    // Seed a past session with BPM so history badge is testable
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const { data: session, error: sessionError } = await db
      .from('practice_sessions')
      .insert({
        student_id: STUDENT_ID,
        song_id: seededSongId,
        duration_minutes: 20,
        bpm_practiced: 80,
        notes: 'E2E-BPM past session',
        created_at: yesterday.toISOString(),
      })
      .select('id')
      .single();
    expect(sessionError, `practice_sessions seed failed: ${sessionError?.message}`).toBeNull();
    seededSessionId = session!.id;
  });

  test.afterAll(async () => {
    const db = adminClient();
    if (seededSessionId) await db.from('practice_sessions').delete().eq('id', seededSessionId);
    await db
      .from('practice_sessions')
      .delete()
      .eq('student_id', STUDENT_ID)
      .like('notes', 'E2E-BPM%');
    if (seededLessonId) {
      await db.from('lesson_songs').delete().eq('lesson_id', seededLessonId);
      await db.from('lessons').delete().eq('id', seededLessonId);
    }
    if (seededRepertoireId)
      await db.from('student_repertoire').delete().eq('id', seededRepertoireId);
    if (seededSongId) await db.from('songs').delete().eq('id', seededSongId);
  });

  test.describe('Student role', () => {
    test.beforeEach(async ({ loginAs }) => {
      await loginAs('student');
    });

    test('B7.1 BPM input hidden when no song selected', async ({ page }) => {
      await page.goto('/dashboard/practice');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('label:has-text("BPM practiced")')).not.toBeVisible();
    });

    test('B7.2 BPM input appears after selecting a song', async ({ page }) => {
      await page.goto('/dashboard/practice');
      await page.waitForLoadState('networkidle');

      await page.selectOption('#practice-song', seededSongId!);
      await expect(page.locator('label:has-text("BPM practiced")')).toBeVisible({ timeout: 5_000 });
      await expect(page.locator('#practice-bpm')).toBeVisible();
    });

    test('B7.3 seeded session with BPM shows badge in history', async ({ page }) => {
      await page.goto('/dashboard/practice');
      await page.waitForLoadState('networkidle');

      const historySection = page.locator('[data-slot="card"]', { hasText: /History/ }).first();
      await expect(historySection).toBeVisible({ timeout: 10_000 });
      const bpmRow = historySection.locator('li', { hasText: 'E2E-BPM past session' }).first();
      await expect(bpmRow).toBeVisible({ timeout: 10_000 });
      await expect(bpmRow.locator('text=/80 BPM/')).toBeVisible();
    });

    test('B7.4 log session with BPM, badge visible in history', async ({ page }) => {
      await page.goto('/dashboard/practice');
      await page.waitForLoadState('networkidle');

      await page.selectOption('#practice-song', seededSongId!);
      await page.fill('#practice-bpm', '90');
      await page.locator('button:has-text("15m")').click();
      await page.locator('textarea#practice-notes').fill('E2E-BPM new session');
      await page.getByRole('button', { name: 'Log practice' }).click();

      await expect(page.locator('text=/Practice logged/i').first()).toBeVisible({
        timeout: 10_000,
      });
      await page.waitForLoadState('networkidle');

      const historySection = page.locator('[data-slot="card"]', { hasText: /History/ }).first();
      const newRow = historySection.locator('li', { hasText: 'E2E-BPM new session' }).first();
      await expect(newRow.locator('text=/90 BPM/')).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe('Admin role', () => {
    test.beforeEach(async ({ loginAs }) => {
      await loginAs('admin');
    });

    test('B7.5 admin practice page loads correctly', async ({ page }) => {
      await page.goto('/dashboard/practice');
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { name: /practice/i })).toBeVisible({
        timeout: 15_000,
      });
      await expect(page.getByRole('button', { name: 'Log practice' })).toBeVisible();
    });
  });
});
