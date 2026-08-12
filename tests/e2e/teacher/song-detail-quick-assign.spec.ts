import { test, expect } from '../../fixtures';
import { adminClient, getStudentId } from '../../helpers/seed-ids';

/**
 * Song detail — Quick Assign sidebar widget. A teacher assigns a song to a
 * student with a due date + goal; the student then sees it in their
 * repertoire. Staff-only: hidden from the student's own view.
 */

const timestamp = Date.now();
const SONG_TITLE = `E2E Quick Assign Song ${timestamp}`;

test.describe('Song detail — Quick assign', { tag: ['@teacher', '@songs'] }, () => {
  let songId: string | null = null;

  test.afterEach(async ({ page }) => {
    if (songId) {
      const db = adminClient();
      await db.from('student_repertoire').delete().eq('song_id', songId);
      await page.request.delete(`/api/song?id=${songId}`);
    }
    songId = null;
  });

  test('teacher assigns a song to a student with a due date and goal, student sees it', async ({
    page,
    loginAs,
  }) => {
    test.setTimeout(90_000);

    await loginAs('teacher');
    await page.goto('/dashboard/songs/new');
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="title"]').fill(SONG_TITLE);
    await page.locator('input[name="author"]').fill('E2E Quick Assign Artist');
    await page.getByRole('button', { name: 'Create song' }).click();
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    songId = new URL(page.url()).pathname.split('/').pop() ?? null;

    await page.getByRole('link', { name: /assign to student/i }).click();
    await expect(page.locator('#quick-assign')).toBeInViewport();

    const studentDb = adminClient();
    const studentId = await getStudentId(studentDb);
    await page.getByTestId(`student-option-${studentId}`).click();
    await page.getByTestId('quick-assign-due-date').fill('2026-12-01');
    await page.getByTestId('quick-assign-goal').fill('Memorise intro');
    await page.getByTestId('quick-assign-submit').click();

    await expect(page.getByText(/assigned to 1 student/i)).toBeVisible({ timeout: 10_000 });

    await loginAs('student');
    await page.goto('/dashboard/repertoire');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(SONG_TITLE).first()).toBeVisible({ timeout: 10_000 });
  });

  test('student does not see the Quick assign widget on a song page', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.goto('/dashboard/songs/new');
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="title"]').fill(SONG_TITLE);
    await page.locator('input[name="author"]').fill('E2E Quick Assign Artist');
    await page.getByRole('button', { name: 'Create song' }).click();
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    songId = new URL(page.url()).pathname.split('/').pop() ?? null;

    await loginAs('student');
    await page.goto(`/dashboard/songs/${songId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('#quick-assign')).toHaveCount(0);
  });
});
