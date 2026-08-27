import { test, expect } from '../../fixtures';
import { adminClient, getStudentId, getTeacherId } from '../../helpers/seed-ids';

/**
 * Lessons list — the seven behaviours every browsable list must prove
 * (docs/app-blueprint/reference/LIST_TABLE_PATTERN.md §5), for the teacher POV.
 *
 * The lessons list adopted the standard set by the songs list: a row click now
 * opens a slide-in panel via `?selected=<id>` instead of navigating to
 * `/dashboard/lessons/[id]`, column headers sort, and every control routes
 * through one `buildHref`.
 *
 * Selector rules that matter here and break silently if ignored:
 *  - the row link carries only an `aria-label` (`#12 Title — Jul 22, 2026`),
 *    so `a:has-text(title)` matches nothing;
 *  - row links point at `?selected=`, never at the detail route.
 */

const RUN = Date.now();
const TITLE = `E2E Panel Lesson ${RUN}`;

let lessonId: string | null = null;

test.describe('Lessons List Panel', { tag: ['@teacher', '@lessons'] }, () => {
  test.beforeAll(async () => {
    const db = adminClient();
    const [teacherId, studentId] = await Promise.all([getTeacherId(db), getStudentId(db)]);

    // Seeded rather than created through the UI: this spec is about the list's
    // behaviour, and the create form has its own coverage.
    const { data, error } = await db
      .from('lessons')
      .insert({
        teacher_id: teacherId,
        student_id: studentId,
        title: TITLE,
        status: 'SCHEDULED',
        scheduled_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();
    expect(error, `lesson insert: ${error?.message}`).toBeNull();
    lessonId = data!.id;
  });

  test.afterAll(async () => {
    const db = adminClient();
    if (lessonId) await db.from('lessons').delete().eq('id', lessonId);
  });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  test('row click opens the panel; open-full-page and close both work', async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/dashboard/lessons');
    await page.waitForLoadState('networkidle');

    const row = page.getByRole('link', { name: new RegExp(TITLE) }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });

    // Closed until a row is clicked.
    await expect(page).not.toHaveURL(/selected=/);
    await row.click();
    await page.waitForURL(new RegExp(`selected=${lessonId}`), { timeout: 10_000 });

    // Scoped to the panel: the lesson title also appears in the row behind it.
    const panel = page.getByRole('complementary', { name: `Lesson detail: ${TITLE}` });
    await expect(panel).toBeVisible({ timeout: 10_000 });

    await panel.getByRole('link', { name: 'Open full page' }).click();
    await page.waitForURL(`**/dashboard/lessons/${lessonId}`, { timeout: 10_000 });

    // Back on the list with the panel open, close clears only `selected`.
    await page.goto(`/dashboard/lessons?selected=${lessonId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: 'Close' }).click();
    await page.waitForURL((url) => !url.search.includes('selected='), { timeout: 10_000 });
  });

  test('clicking the open row closes the panel again', async ({ page }) => {
    await page.goto(`/dashboard/lessons?selected=${lessonId}`);
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('link', { name: new RegExp(TITLE) })
      .first()
      .click();
    await page.waitForURL((url) => !url.search.includes('selected='), { timeout: 10_000 });
    await expect(page.getByRole('complementary', { name: `Lesson detail: ${TITLE}` })).toHaveCount(
      0
    );
  });

  test('a column header sorts, and clicking it again reverses', async ({ page }) => {
    await page.goto('/dashboard/lessons');
    await page.waitForLoadState('networkidle');

    // Scoped to the header strip: Playwright matches accessible names by
    // substring, so an unscoped 'Title' also hits any row labelled
    // "…Untitled lesson…".
    const titleHeader = page
      .locator('.ui-datalist-desktop')
      .first()
      .getByRole('link', {
        name: /^Title/,
      });

    await titleHeader.click();
    await page.waitForURL(/sort=title_asc/, { timeout: 10_000 });

    await titleHeader.click();
    await page.waitForURL(/sort=title_desc/, { timeout: 10_000 });
  });

  test('sorting flattens the grouped view', async ({ page }) => {
    await page.goto('/dashboard/lessons');
    await page.waitForLoadState('networkidle');
    // Grouped by default — time-bucket headers are present.
    const grouped = await page.getByText(/^(Today|This week|Upcoming|Past)$/).count();
    expect(grouped).toBeGreaterThan(0);

    await page.goto('/dashboard/lessons?sort=title_asc');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/^(Today|This week|Upcoming|Past)$/)).toHaveCount(0);
  });

  test('a status filter narrows the list and keeps the panel selection out of it', async ({
    page,
  }) => {
    await page.goto('/dashboard/lessons?status=cancelled');
    await page.waitForLoadState('networkidle');

    // The seeded lesson is SCHEDULED, so a cancelled-only filter must hide it.
    await expect(page.getByRole('link', { name: new RegExp(TITLE) })).toHaveCount(0);
  });

  test('opening the panel preserves the active filter', async ({ page }) => {
    await page.goto('/dashboard/lessons?status=scheduled');
    await page.waitForLoadState('networkidle');

    await page
      .getByRole('link', { name: new RegExp(TITLE) })
      .first()
      .click();
    await page.waitForURL(/selected=/, { timeout: 10_000 });
    await expect(page).toHaveURL(/status=scheduled/);
  });
});
