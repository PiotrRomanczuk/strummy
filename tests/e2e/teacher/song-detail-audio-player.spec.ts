import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';

/**
 * Song detail — audio player. Renders a real <audio> element with
 * play/pause when `songs.audio_files` has a URL; hidden otherwise (covered
 * by the Jest unit tests, not re-asserted here to avoid a redundant E2E).
 */

let songId: string | null = null;
let originalAudioFiles: Record<string, string> | null = null;

// Tiny silent WAV as a data: URI — avoids depending on an external host for
// audio, which would make this test flaky under a network-restricted runner.
const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRjQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YRAAAAAAAAAAAAAAAAAAAAAAAAAA';

test.describe('Song detail — audio player', { tag: ['@teacher', '@songs'] }, () => {
  test.beforeAll(async () => {
    const db = adminClient();
    const { data } = await db
      .from('songs')
      .select('id, audio_files')
      .is('deleted_at', null)
      .limit(1)
      .single();
    songId = data?.id ?? null;
    originalAudioFiles = (data?.audio_files as Record<string, string> | null) ?? null;

    if (songId) {
      await db
        .from('songs')
        .update({
          audio_files: { backing_track: SILENT_WAV_DATA_URI },
        })
        .eq('id', songId);
    }
  });

  test.afterAll(async () => {
    if (songId) {
      const db = adminClient();
      await db
        .from('songs')
        .update({ audio_files: originalAudioFiles ?? {} })
        .eq('id', songId);
    }
  });

  test.beforeEach(async ({ loginAs }) => {
    await loginAs('teacher');
  });

  test('renders and toggles play/pause', async ({ page }) => {
    test.skip(!songId, 'No song available to seed from');

    await page.goto(`/dashboard/songs/${songId}`);
    await page.waitForLoadState('networkidle');

    const player = page.getByTestId('song-audio-player');
    await expect(player).toBeVisible({ timeout: 15_000 });

    const toggle = page.getByTestId('audio-play-toggle');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-label', /pause/i, { timeout: 5_000 });
  });
});
