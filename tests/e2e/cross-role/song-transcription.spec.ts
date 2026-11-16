import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';

/**
 * SNG-12: the "Transcription" card (song2logic's bass line and vocal melody) is for staff only. A machine
 * transcription of a recording is a teacher's working material; RLS gives a student no row and the page never
 * renders the card for them.
 */

const CARD = /^(Bass line & melody|Linia basu i melodia)$/;
const SONG_TITLE = `E2E transcription ${Date.now()}`;

const transcription = {
  recording_url: 'https://www.youtube.com/watch?v=Y7C21yNsw2g',
  tool_version: 'e2e',
  transcribed_on: '2026-11-15',
  note_count: 3,
  grid: { bpm: 120, beats_per_bar: 4, downbeats_s: [0.5, 2.5, 4.5, 6.5] },
  tracks: {
    Bas: [
      [0.5, 0.5, 40, 90, 1, 0],
      [2.5, 0.5, 43, 90, 2, 0],
    ],
    Wokal: [[4.5, 1, 64, 80, 3, 0]],
  },
  stats: {},
};

test.describe('Song transcription card', { tag: ['@cross-role', '@access-control'] }, () => {
  let db: ReturnType<typeof adminClient>;
  let songId: string;

  test.beforeAll(async () => {
    db = adminClient();
    const { data, error } = await db
      .from('songs')
      .insert({ title: SONG_TITLE, author: 'E2E', level: 'beginner' })
      .select('id')
      .single();
    if (error || !data) throw new Error(`could not seed song: ${error?.message}`);
    songId = data.id;
    const { error: transcriptionError } = await db
      .from('song_transcriptions')
      .insert({ song_id: songId, ...transcription });
    if (transcriptionError)
      throw new Error(`could not seed transcription: ${transcriptionError.message}`);
  });

  test.afterAll(async () => {
    // songs → song_transcriptions cascades.
    await db.from('songs').delete().eq('id', songId);
  });

  test('a teacher sees the bass line and can switch to the vocals', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.goto(`/dashboard/songs/${songId}`);
    await expect(page.getByText(CARD)).toBeVisible();
    await expect(page.getByRole('img', { name: /^(Bass|Bas): / })).toBeVisible();
    await page.getByRole('button', { name: /^(Vocals|Wokal)$/ }).click();
    await expect(page.getByRole('img', { name: /^(Vocals|Wokal): / })).toBeVisible();
  });

  test('a student never sees the card', async ({ page, loginAs }) => {
    await loginAs('student');
    await page.goto(`/dashboard/songs/${songId}`);
    await expect(page.getByRole('heading', { name: SONG_TITLE }).first()).toBeVisible();
    await expect(page.getByText(CARD)).toHaveCount(0);
  });
});
