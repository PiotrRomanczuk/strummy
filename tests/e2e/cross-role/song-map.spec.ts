import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';

/**
 * SNG-16: the "Song map" card (song2logic's parts of the recording with their chords, groove and bass riff) is
 * for staff only. A machine analysis of a recording is a teacher's working material; RLS gives a student no row
 * and the page never renders the card for them.
 */

const CARD = /^(Parts, chords and groove|Części, akordy i groove)$/;
const SONG_TITLE = `E2E song map ${Date.now()}`;

const part = (n: number, name: string, drums: object | null) => ({
  n,
  label: name === 'intro' ? 'A' : 'B',
  name,
  repeat_of: null,
  first_bar: 1 + (n - 1) * 4,
  bars: 4,
  start_s: (n - 1) * 8,
  end_s: n * 8,
  bpm: 120,
  vocals: name !== 'intro',
  chords: ['Em', 'G', 'Em', 'G'],
  roman: ['vi', 'I', 'vi', 'I'],
  loop: ['vi', 'I'],
  bass: null,
  drums,
  levels: {},
});

const segments = {
  recording_url: 'https://www.youtube.com/watch?v=Y7C21yNsw2g',
  tool_version: 'e2e',
  analysed_on: '2026-11-17',
  song_key: 'G major',
  bpm: 120,
  feel: 'straight',
  felt_bpm: 120,
  beats_per_bar: 4,
  part_count: 2,
  parts: [
    part(1, 'intro', null),
    part(2, 'verse', {
      patterns: { Stopa: 'X.......X.......', Werbel: '....X.......X...' },
      kick: 'one_and_three',
      snare: 'backbeat',
      cymbal: null,
      fills: [],
    }),
  ],
  bass_bars: [null, null],
};

test.describe('Song map card', { tag: ['@cross-role', '@access-control'] }, () => {
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
    const { error: segmentsError } = await db
      .from('song_segments')
      .insert({ song_id: songId, ...segments });
    if (segmentsError) throw new Error(`could not seed segments: ${segmentsError.message}`);
  });

  test.afterAll(async () => {
    // songs → song_segments cascades.
    await db.from('songs').delete().eq('id', songId);
  });

  test('a teacher sees the parts and the groove of a picked part', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.goto(`/dashboard/songs/${songId}`);
    await expect(page.getByText(CARD)).toBeVisible();
    await page.getByRole('button', { name: /^2\. (Verse|Zwrotka), / }).click();
    await expect(page.getByRole('img', { name: /^(Kick|Stopa): / })).toBeVisible();
    await expect(page.getByText(/(snare on 2 and 4|werbel na 2 i 4)/)).toBeVisible();
  });

  test('a student never sees the card', async ({ page, loginAs }) => {
    await loginAs('student');
    await page.goto(`/dashboard/songs/${songId}`);
    await expect(page.getByRole('heading', { name: SONG_TITLE }).first()).toBeVisible();
    await expect(page.getByText(CARD)).toHaveCount(0);
  });
});
