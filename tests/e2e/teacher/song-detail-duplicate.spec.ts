import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';

/**
 * Song detail — Duplicate action. Clones the song (and its sections) as an
 * unpublished draft. Staff-only: a student must not see the button.
 */

const timestamp = Date.now();
const SOURCE_TITLE = `E2E Duplicate Source ${timestamp}`;

test.describe('Song detail — Duplicate', { tag: ['@teacher', '@songs'] }, () => {
  let sourceSongId: string | null = null;
  let duplicateSongId: string | null = null;

  // These drive the desktop song form ("Create song" header button, cover URL
  // field); phones get the step wizard, covered in songs-crud.
  test.use({ viewport: { width: 1440, height: 900 } });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  // Service-role delete, not page.request: the student test switches the
  // browser session to the student, whose DELETE was refused — the songs then
  // leaked into the shared catalog on every run.
  test.afterEach(async () => {
    const ids = [duplicateSongId, sourceSongId].filter((id): id is string => Boolean(id));
    if (ids.length > 0) {
      const { error } = await adminClient().from('songs').delete().in('id', ids);
      expect(error, `song cleanup failed: ${error?.message}`).toBeNull();
    }
    duplicateSongId = null;
    sourceSongId = null;
  });

  test('teacher duplicates a song and lands on the new draft copy', async ({ page }) => {
    test.setTimeout(60_000);

    await page.goto('/dashboard/songs/new');
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="title"]').fill(SOURCE_TITLE);
    await page.locator('input[name="author"]').fill('E2E Duplicate Artist');
    await page.getByRole('button', { name: 'Create song' }).click();
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    sourceSongId = new URL(page.url()).pathname.split('/').pop() ?? null;

    await expect(page.getByRole('button', { name: /duplicate/i })).toBeVisible({
      timeout: 10_000,
    });
    await page.getByRole('button', { name: /duplicate/i }).click();

    // waitForURL with a generic "/songs/<uuid>" pattern would resolve
    // immediately (we're already on such a URL) — wait for the actual
    // navigation by asserting the URL no longer points at the source song.
    await expect
      .poll(() => page.url(), { timeout: 20_000 })
      .not.toContain(`/dashboard/songs/${sourceSongId}`);
    duplicateSongId = new URL(page.url()).pathname.split('/').pop() ?? null;
    expect(duplicateSongId).not.toBe(sourceSongId);

    await expect(
      page.getByRole('heading', { name: `Copy of ${SOURCE_TITLE}` }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('student does not see the Duplicate or Assign buttons', async ({ page, loginAs }) => {
    await page.goto('/dashboard/songs/new');
    await page.waitForLoadState('networkidle');
    await page.locator('input[name="title"]').fill(SOURCE_TITLE);
    await page.locator('input[name="author"]').fill('E2E Duplicate Artist');
    await page.getByRole('button', { name: 'Create song' }).click();
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    sourceSongId = new URL(page.url()).pathname.split('/').pop() ?? null;

    await loginAs('student');
    await page.goto(`/dashboard/songs/${sourceSongId}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /duplicate/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /assign to student/i })).toHaveCount(0);
  });
});
