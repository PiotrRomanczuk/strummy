import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';

/**
 * Song detail — "Chords & structure" / "Lyrics" content tabs. Not
 * role-gated (every viewer sees the same switcher), so this checks it works
 * from both a staff and a non-staff point of view rather than repeating the
 * same assertion for every role.
 */

let songId: string | null = null;

test.describe('Song detail — content tabs', { tag: ['@songs'] }, () => {
  test.beforeAll(async () => {
    const db = adminClient();
    const { data } = await db.from('songs').select('id').is('deleted_at', null).limit(1).single();
    songId = data?.id ?? null;
  });

  test('teacher can switch between Chords & structure and Lyrics', async ({ page, loginAs }) => {
    test.skip(!songId, 'No song available to seed from');
    await loginAs('teacher');

    await page.goto(`/dashboard/songs/${songId}`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('tab', { name: /chords & structure/i, selected: true })
    ).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('tab', { name: /^lyrics$/i }).click();
    await expect(page.getByRole('tab', { name: /^lyrics$/i, selected: true })).toBeVisible();
  });

  test('student can switch between Chords & structure and Lyrics', async ({ page, loginAs }) => {
    test.skip(!songId, 'No song available to seed from');
    await loginAs('student');

    await page.goto(`/dashboard/songs/${songId}`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('tab', { name: /chords & structure/i, selected: true })
    ).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('tab', { name: /^lyrics$/i }).click();
    await expect(page.getByRole('tab', { name: /^lyrics$/i, selected: true })).toBeVisible();
  });
});
