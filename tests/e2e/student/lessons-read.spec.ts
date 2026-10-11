import { test, expect } from '../../fixtures';
import { adminClient, getStudentId, getAdminId } from '../../helpers/seed-ids';

/**
 * Student Lessons Read-Only E2E Tests
 *
 * Verifies that students can browse and view their lessons but cannot
 * create, edit, or delete them. Read-only access enforcement.
 *
 * A lesson is seeded via the admin client in beforeAll so tests run
 * against guaranteed data regardless of DB state.
 */

// Keep this file in ONE worker: under fullyParallel, a second worker re-runs
// beforeAll, whose title-scoped cleanup deletes the first worker's seeded
// lesson mid-flight (the "view lesson detail" flake).
test.describe.configure({ mode: 'default' });

// Resolved at runtime from the configured test-account emails (see beforeAll).
let STUDENT_ID = '';
let TEACHER_ID = '';

let seededLessonId: string | null = null;
let seededSongTitle: string | null = null;
let seededLessonSongId: string | null = null;
// A lesson that belongs to a DIFFERENT student: the isolation test asserts the
// signed-in student can neither list nor open it.
let foreignLessonId: string | null = null;
const FOREIGN_TITLE = 'E2E Foreign Student Lesson';

test.describe('Student Lessons (Read-Only)', { tag: ['@student', '@lessons'] }, () => {
  test.beforeAll(async () => {
    const db = adminClient();
    STUDENT_ID = await getStudentId(db);
    // Use the admin-teacher here so this suite's lesson seed doesn't collide with
    // songs-read (teacher@example.com) on the per-(teacher,student) lesson number.
    TEACHER_ID = await getAdminId(db);

    // Remove any leftover E2E lessons from previous runs
    await db
      .from('lessons')
      .delete()
      .eq('student_id', STUDENT_ID)
      .eq('title', 'E2E Read-Only Lesson');

    const { data: lesson } = await db
      .from('lessons')
      .insert({
        teacher_id: TEACHER_ID,
        student_id: STUDENT_ID,
        title: 'E2E Read-Only Lesson',
        scheduled_at: '2026-09-15T10:00:00Z',
        status: 'SCHEDULED',
      })
      .select('id')
      .single();
    seededLessonId = lesson?.id ?? null;

    const { data: song } = await db
      .from('songs')
      .select('id, title')
      .is('deleted_at', null)
      .limit(1)
      .single();
    if (seededLessonId && song) {
      const { data: link } = await db
        .from('lesson_songs')
        .insert({ lesson_id: seededLessonId, song_id: song.id })
        .select('id')
        .single();
      seededLessonSongId = link?.id ?? null;
      seededSongTitle = link ? (song.title as string) : null;
    }

    const { data: other } = await db
      .from('profiles')
      .select('id')
      .eq('is_student', true)
      .neq('id', STUDENT_ID)
      .limit(1)
      .single();
    if (other) {
      await db.from('lessons').delete().eq('student_id', other.id).eq('title', FOREIGN_TITLE);
      const { data: foreign } = await db
        .from('lessons')
        .insert({
          teacher_id: TEACHER_ID,
          student_id: other.id,
          title: FOREIGN_TITLE,
          scheduled_at: '2030-01-10T10:00:00Z',
          status: 'SCHEDULED',
        })
        .select('id')
        .single();
      foreignLessonId = foreign?.id ?? null;
    }
  });

  test.afterAll(async () => {
    const db = adminClient();
    if (seededLessonSongId) await db.from('lesson_songs').delete().eq('id', seededLessonSongId);
    if (seededLessonId) await db.from('lessons').delete().eq('id', seededLessonId);
    if (foreignLessonId) await db.from('lessons').delete().eq('id', foreignLessonId);
  });

  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('student');
    await page.evaluate(() => localStorage.setItem('strummy-demo-welcome-seen', 'true'));
  });

  test('lessons list loads with no Create button @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/dashboard/lessons');
    await page.waitForLoadState('networkidle');

    // Verify heading
    const heading = page
      .locator('h1, h2')
      .filter({ hasText: /lesson/i })
      .first();
    await expect(heading).toBeVisible({ timeout: 15_000 });

    // Wait for page content to settle
    await page.waitForTimeout(2000);

    // Verify NO create/new lesson controls are visible
    const createControls = page.locator(
      '[data-testid="create-lesson-button"], button:has-text("Create Lesson"), a:has-text("Create Lesson"), a:has-text("New Lesson"), a[href="/dashboard/lessons/new"], button[aria-label="Add new lesson"], [data-testid="new-lesson-button"]'
    );
    await expect(createControls).toHaveCount(0);
  });

  test('view lesson detail @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // The list row now opens the slide-in detail panel (see
    // lessons-list-panel.spec.ts) rather than navigating here, so this test —
    // which is about the full detail page — goes there directly.
    await page.goto(`/dashboard/lessons/${seededLessonId}`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/lessons\/[a-zA-Z0-9-]+/);

    // Verify lesson detail content is visible
    const detailHeading = page.locator('h1, h2').first();
    await expect(detailHeading).toBeVisible({ timeout: 10_000 });

    // Check for date, teacher, or notes content on the page
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible();

    // Verify at least some lesson information is present (date, teacher name, or notes)
    const dateInfo = page
      .getByText(/\d{4}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i)
      .first();
    const teacherInfo = page.getByText(/teacher|instructor/i).first();
    const notesInfo = page.getByText(/note/i).first();

    const hasDate = (await dateInfo.count()) > 0;
    const hasTeacher = (await teacherInfo.count()) > 0;
    const hasNotes = (await notesInfo.count()) > 0;

    // At least one piece of lesson metadata should be visible
    expect(hasDate || hasTeacher || hasNotes).toBeTruthy();
  });

  test('no edit or delete controls on lesson detail @mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // Straight to the detail page: a list row now opens the slide-in panel
    // instead of navigating (see lessons-list-panel.spec.ts).
    await page.goto(`/dashboard/lessons/${seededLessonId}`);
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/dashboard\/lessons\/[a-zA-Z0-9-]+/);

    // Wait for page to fully render
    await page.waitForTimeout(2000);

    // Verify no edit controls
    const editControls = page.locator(
      '[data-testid="lesson-edit-button"], a[href*="/edit"], button:has-text("Edit")'
    );
    await expect(editControls).toHaveCount(0);

    // The delete trigger is an icon button with only aria-label="Delete lesson",
    // which a has-text selector can never match — query by role + name.
    await expect(page.getByRole('button', { name: /delete/i })).toHaveCount(0);
  });

  test('lesson detail lists the songs on the lesson @mobile', async ({ page }) => {
    test.skip(!seededSongTitle, 'No song available to attach to the lesson');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/dashboard/lessons/${seededLessonId}`);
    await page.waitForLoadState('networkidle');

    // A link on desktop, plain text in the phone composition — match the text.
    await expect(
      page.locator('main').getByText(seededSongTitle!, { exact: true }).filter({ visible: true })
    ).toHaveCount(1, { timeout: 20_000 });
  });

  test("another student's lesson is neither listed nor reachable @desktop", async ({ page }) => {
    test.skip(!foreignLessonId, 'No second student on this stack to own a foreign lesson');
    await page.setViewportSize({ width: 1920, height: 1080 });

    await page.goto('/dashboard/lessons?year=2030');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByText(FOREIGN_TITLE)).toHaveCount(0);
    await expect(page.locator(`a[href*="${foreignLessonId}"]`)).toHaveCount(0);

    // Direct URL: RLS hides the row, so the page must not render it.
    await page.goto(`/dashboard/lessons/${foreignLessonId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(FOREIGN_TITLE)).toHaveCount(0);

    // No teacher/admin bulk controls either.
    await expect(page.getByRole('button', { name: /bulk|import|export/i })).toHaveCount(0);
  });
});
