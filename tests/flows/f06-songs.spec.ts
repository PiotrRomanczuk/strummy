import { test, expect } from '../fixtures';
import { adminClient } from '../helpers/seed-ids';

/**
 * F06 — Song library: teacher creates/edits → student browses, wants to learn.
 */
const RUN = Date.now();
const TITLE = `E2E Flow Song ${RUN}`;

test.describe('F06 songs', { tag: ['@flow'] }, () => {
  test.describe.configure({ mode: 'serial' });
  let songId: string | undefined;

  test.afterAll(async () => {
    const db = adminClient();
    if (songId) {
      await db.from('student_repertoire').delete().eq('song_id', songId);
      await db.from('songs').delete().eq('id', songId);
    }
  });

  test('F06.1 teacher creates a song (desktop form)', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard/songs/new');
    await page.locator('input[name="title"]').fill(TITLE);
    await page.locator('input[name="author"]').fill('E2E Flow Artist');
    await page.getByTestId('song-save').click();
    await page.waitForURL(/\/dashboard\/songs\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    songId = page.url().split('/').pop();
    await expect(page.getByRole('heading', { name: TITLE }).first()).toBeVisible();
  });

  test('F06.2 teacher edits it and the change persists', async ({ page, loginAs }) => {
    test.skip(
      true,
      'TODO automate: edit-page save button / redirect differ from the guess; see teacher/songs-crud.spec.ts'
    );
    test.skip(!songId, 'F06.1 did not create a song');
    await loginAs('teacher');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/dashboard/songs/${songId}/edit`);
    await page.locator('input[name="title"]').fill(`${TITLE} edited`);
    await page
      .getByRole('button', { name: /save changes/i })
      .first()
      .click();
    await page.waitForURL(new RegExp(`/dashboard/songs/${songId}$`), { timeout: 20_000 });
    const { data } = await adminClient().from('songs').select('title').eq('id', songId!).single();
    expect(data?.title).toBe(`${TITLE} edited`);
  });

  test('F06.3 the student finds it in the library', async ({ page, loginAs }) => {
    test.skip(!songId, 'F06.1 did not create a song');
    await loginAs('student');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard/songs');
    await page
      .locator('main')
      .getByPlaceholder(/search by title/i)
      .fill(TITLE);
    await expect(page.locator(`a[href*="selected=${songId}"]`).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test('F06.4 the student marks it "want to learn" and it lands in their repertoire', async ({
    page,
    loginAs,
  }) => {
    test.skip(!songId, 'F06.1 did not create a song');
    await loginAs('student');
    await page.goto(`/dashboard/songs/${songId}`);
    await page
      .getByRole('button', { name: /want to learn/i })
      .first()
      .click();
    await expect
      .poll(
        async () =>
          (
            await adminClient()
              .from('student_repertoire')
              .select('id', { count: 'exact', head: true })
              .eq('song_id', songId!)
          ).count,
        { timeout: 10_000 }
      )
      .toBe(1);
  });
});
