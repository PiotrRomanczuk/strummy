import { test, expect } from '../fixtures';
import { openFretboard } from '../helpers/fretboard';
import { adminClient, getTeacherId } from '../helpers/seed-ids';

/**
 * F09 — Fretboard explorer + save preset.
 */
test.describe('F09 fretboard', { tag: ['@flow'] }, () => {
  test('F09.1 a shared link opens the same view for a student', async ({ page, loginAs }) => {
    await loginAs('student');
    await openFretboard(page, '?key=G&mode=chord&chord=major');
    await expect(page.getByTestId('fb-title')).toContainText('G');
    await expect(page.locator('[data-testid="fb-info-description"]')).toContainText(/major/i);
  });

  test('F09.2 the teacher saves a preset and it is listed after reload', async ({
    page,
    loginAs,
  }) => {
    const name = `E2E Flow Preset ${Date.now()}`;
    const teacherId = await getTeacherId(adminClient());
    try {
      await loginAs('teacher');
      await openFretboard(page, '?key=A&scale=pentatonic_minor');
      await page.getByRole('button', { name: /save preset/i }).click();
      await page.getByPlaceholder(/preset name|name/i).fill(name);
      await page.getByRole('button', { name: /^save$/i }).click();
      await page.reload();
      await openFretboard(page);
      await expect(page.getByText(name)).toBeVisible({ timeout: 15_000 });
    } finally {
      // profile_id, not owner_id: the old filter named a column that does not
      // exist, the delete errored silently and 246 presets piled up on dev.
      const { error } = await adminClient()
        .from('fretboard_presets')
        .delete()
        .eq('name', name)
        .eq('profile_id', teacherId);
      expect(error, `preset cleanup failed: ${error?.message}`).toBeNull();
    }
  });
});
