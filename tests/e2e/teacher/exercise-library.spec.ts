import { test, expect } from '../../fixtures';
import { adminClient } from '../../helpers/seed-ids';

/**
 * SNG-18: the exercise library (#1146, #1213). A teacher saves a part of a song as an exercise from the card, finds
 * it in the library narrowed to that song and kind, and its link opens the card on that part in a loop.
 */

const STAMP = Date.now();
const NAME = `E2E riff ${STAMP}`;
const DOWNBEATS = Array.from({ length: 8 }, (_, i) => 0.5 + i * 2);
const VIDEO = 'https://www.youtube.com/watch?v=Y7C21yNsw2g';

const part = (n: number, name: string) => ({
  n,
  label: n === 1 ? 'A' : 'B',
  name,
  repeat_of: null,
  first_bar: 1 + (n - 1) * 4,
  bars: 4,
  start_s: 0.5 + (n - 1) * 8,
  end_s: 0.5 + n * 8,
  bpm: 120,
  vocals: n !== 1,
  chords: ['Em', 'G', 'Em', 'G'],
  roman: ['vi', 'I', 'vi', 'I'],
  loop: ['vi', 'I'],
  bass: null,
  drums: { patterns: {}, kick: null, snare: null, cymbal: null, fills: [] },
  levels: {},
});

test.describe('Exercise library', { tag: ['@teacher'] }, () => {
  const db = adminClient();
  let songId = '';

  test.beforeAll(async () => {
    const { data, error } = await db
      .from('songs')
      .insert({ title: `E2E exercises ${STAMP}`, author: 'E2E', level: 'beginner' })
      .select('id')
      .single();
    if (error || !data) throw new Error(`could not seed song: ${error?.message}`);
    songId = data.id;
    const seeded = await Promise.all([
      db.from('song_analyses').insert({
        song_id: songId,
        tool: 'e2e',
        source_url: VIDEO,
        bpm: 120,
        beats_per_bar: 4,
        chords: ['Em', 'G'],
        analysis: {
          created: '2026-11-27',
          duration_s: 17,
          grid: { bpm: 120, beats_per_bar: 4, beats_s: DOWNBEATS, downbeats_s: DOWNBEATS },
          key: { tonic: 'G', scale: 'major' },
          chords: DOWNBEATS.map((_, i) => ({ bar: i + 1, chord: i % 2 ? 'G' : 'Em' })),
        },
      }),
      db.from('song_segments').insert({
        song_id: songId,
        recording_url: VIDEO,
        tool_version: 'e2e',
        analysed_on: '2026-11-27',
        song_key: 'G major',
        bpm: 120,
        feel: 'straight',
        felt_bpm: 120,
        beats_per_bar: 4,
        part_count: 2,
        parts: [part(1, 'intro'), part(2, 'verse')],
        bass_bars: [null, null],
      }),
    ]);
    const failed = seeded.find((result) => result.error);
    if (failed) throw new Error(`could not seed the card: ${failed.error?.message}`);
  });

  test.afterAll(async () => {
    // The exercise saved through the UI, then the song (analysis and segments cascade).
    await db.from('song_exercises').delete().eq('song_id', songId);
    await db.from('songs').delete().eq('id', songId);
  });

  test('a part saved as an exercise is found in the library and opens the card on that part', async ({
    page,
    loginAs,
  }) => {
    await loginAs('teacher');
    await page.goto(`/dashboard/songs/${songId}/card`);
    const parts = page.getByRole('group', { name: /Parts|Części/ });
    await parts.getByRole('button', { name: /verse/i }).click();

    await page.getByRole('button', { name: /Save as exercise|Zapisz jako ćwiczenie/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^(Name|Nazwa)$/).fill(NAME);
    await dialog.getByRole('button', { name: /^Riff$/ }).click();
    await dialog.getByRole('button', { name: /^(Save|Zapisz)$/ }).click();
    await expect(dialog.getByRole('status')).toBeVisible();

    await page.goto(`/dashboard/exercises?song=${songId}&kind=riff`);
    const row = page.getByRole('listitem').filter({ hasText: NAME });
    await expect(row).toHaveCount(1);
    await row.getByRole('link', { name: /Open in the card|Otwórz w karcie/ }).click();

    await expect(page).toHaveURL(new RegExp(`/dashboard/songs/${songId}/card\\?part=2&loop=1`));
    await expect(parts.getByRole('button', { name: /verse/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
