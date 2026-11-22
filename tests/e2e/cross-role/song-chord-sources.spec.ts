import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';

/**
 * SNG-8: the "Chord sources" card (song2logic's chord review) is for staff only. The review is a
 * teacher's working note; RLS gives a student no row and the page never renders the card for them.
 */

const CARD = /^(Chord sources|Źródła akordów)$/;
const SONG_TITLE = `E2E chord sources ${Date.now()}`;

const review = {
  version: 1,
  status: 'conflict',
  reference: 'chord-id',
  sources: ['strummy', 'chord-id'],
  sheet_chords: ['E', 'A', 'F#m', 'D', 'B'],
  heard_chords: ['E', 'A', 'F#m', 'Bm', 'D'],
  main_chords: ['E', 'A', 'F#m', 'Bm', 'D'],
  transpose: 0,
  coverage: 0.96,
  capo_hint: null,
  capo_matches: true,
  differences: [
    {
      kind: 'mode',
      audio: 'Bm',
      audio_as_written: null,
      sheet: 'B',
      share: 0.04,
      first_s: 71,
      confirmed: true,
      analyze: null,
      chordonomicon: null,
    },
  ],
  keys: { 'chord-id': 'A' },
  key_sources_agree: false,
  sounding_key: null,
};

test.describe('Song chord sources card', { tag: ['@cross-role', '@access-control'] }, () => {
  let db: ReturnType<typeof adminClient>;
  let songId: string;

  test.beforeAll(async () => {
    db = adminClient();
    const { data, error } = await db
      .from('songs')
      .insert({ title: SONG_TITLE, author: 'E2E', chords: 'E, A, F#m, D, B', level: 'beginner' })
      .select('id')
      .single();
    if (error || !data) throw new Error(`could not seed song: ${error?.message}`);
    songId = data.id;
    const { error: reviewError } = await db.from('song_analysis_sources').insert({
      song_id: songId,
      source: 'chord-compare',
      tool_version: 'e2e',
      payload: review,
    });
    if (reviewError) throw new Error(`could not seed review: ${reviewError.message}`);
  });

  test.afterAll(async () => {
    // songs → song_analysis_sources cascades.
    await db.from('songs').delete().eq('id', songId);
  });

  test('a teacher sees the review with the disputed chord', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.goto(`/dashboard/songs/${songId}`);
    await expect(page.getByText(CARD)).toBeVisible();
    await expect(page.getByText('B → Bm')).toBeVisible();
  });

  test('a student never sees the card', async ({ page, loginAs }) => {
    await loginAs('student');
    await page.goto(`/dashboard/songs/${songId}`);
    await expect(page.getByRole('heading', { name: SONG_TITLE }).first()).toBeVisible();
    await expect(page.getByText(CARD)).toHaveCount(0);
    await expect(page.getByText('B → Bm')).toHaveCount(0);
  });
});
