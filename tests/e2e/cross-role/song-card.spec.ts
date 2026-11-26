import { test, expect } from '../../fixtures';
import { adminClient, getStudentId } from '../../helpers/seed-ids';

/**
 * SNG-17: the song card. A teacher opens it for any song with an analysed recording; a student only for a song of
 * their repertoire, through `song_card_for_student`, without the teacher's material and with not-yet-approved
 * chords marked. A song without an analysis says so instead of an empty card.
 */

const STAMP = Date.now();
const DOWNBEATS = Array.from({ length: 8 }, (_, i) => 0.5 + i * 2);

const analysis = {
  tool: 'e2e',
  source_url: 'https://www.youtube.com/watch?v=Y7C21yNsw2g',
  bpm: 120,
  beats_per_bar: 4,
  chords: ['Em', 'G'],
  analysis: {
    created: '2026-11-23',
    duration_s: 17,
    grid: { bpm: 120, beats_per_bar: 4, beats_s: DOWNBEATS, downbeats_s: DOWNBEATS },
    key: { tonic: 'G', scale: 'major' },
    chords: DOWNBEATS.map((_, i) => ({ bar: i + 1, chord: i % 2 ? 'G' : 'Em' })),
    rhythm: [{ track: 'Gitara', pattern: 'X.X.X.X.X.X.X.X.' }],
  },
};

const part = (n: number, name: string) => ({
  n,
  label: name === 'intro' ? 'A' : 'B',
  name,
  repeat_of: null,
  first_bar: 1 + (n - 1) * 4,
  bars: 4,
  start_s: 0.5 + (n - 1) * 8,
  end_s: 0.5 + n * 8,
  bpm: 120,
  vocals: name !== 'intro',
  chords: ['Em', 'G', 'Em', 'G'],
  roman: ['vi', 'I', 'vi', 'I'],
  loop: ['vi', 'I'],
  bass: null,
  drums: {
    patterns: { Werbel: '....X.......X...' },
    kick: null,
    snare: 'backbeat',
    cymbal: null,
    fills: [],
  },
  levels: {},
});

const segments = {
  recording_url: analysis.source_url,
  tool_version: 'e2e',
  analysed_on: '2026-11-23',
  song_key: 'G major',
  bpm: 120,
  feel: 'straight',
  felt_bpm: 120,
  beats_per_bar: 4,
  part_count: 2,
  parts: [part(1, 'intro'), part(2, 'verse')],
  bass_bars: [null, null],
};

test.describe('Song card', { tag: ['@cross-role', '@access-control'] }, () => {
  const db = adminClient();
  const songs: Record<'analysed' | 'bare', string> = { analysed: '', bare: '' };

  test.beforeAll(async () => {
    for (const kind of ['analysed', 'bare'] as const) {
      const { data, error } = await db
        .from('songs')
        .insert({ title: `E2E song card ${kind} ${STAMP}`, author: 'E2E', level: 'beginner' })
        .select('id')
        .single();
      if (error || !data) throw new Error(`could not seed song: ${error?.message}`);
      songs[kind] = data.id;
    }
    const seeded = await Promise.all([
      db.from('song_analyses').insert({ song_id: songs.analysed, ...analysis }),
      db.from('song_segments').insert({ song_id: songs.analysed, ...segments }),
      db
        .from('student_repertoire')
        .insert({ song_id: songs.analysed, student_id: await getStudentId(db) }),
    ]);
    const failed = seeded.find((result) => result.error);
    if (failed) throw new Error(`could not seed the card: ${failed.error?.message}`);
  });

  test.afterAll(async () => {
    // songs → analyses, segments, reviews and the repertoire row cascade.
    await db.from('songs').delete().in('id', Object.values(songs));
  });

  test('a teacher sees the parts, the chords as a proposal and the bar grid', async ({
    page,
    loginAs,
  }) => {
    await loginAs('teacher');
    await page.goto(`/dashboard/songs/${songs.analysed}/card`);
    await expect(page.getByRole('group', { name: /Parts|Części/ }).getByRole('button')).toHaveCount(
      2
    );
    await expect(
      page.getByRole('button', { name: /Approve chords|Zatwierdź akordy/ })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^(Bar|Takt) 1: Em$/ })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Practice link|Link do ćwiczenia/ })
    ).toBeVisible();
  });

  test('a song without an analysis says so', async ({ page, loginAs }) => {
    await loginAs('teacher');
    await page.goto(`/dashboard/songs/${songs.bare}/card`);
    await expect(page.getByTestId('song-card-empty')).toBeVisible();
  });

  test('a student sees the card of a repertoire song without the teacher material', async ({
    page,
    loginAs,
  }) => {
    await loginAs('student');
    await page.goto(`/dashboard/songs/${songs.analysed}/card`);
    await expect(page.getByRole('button', { name: /^(Bar|Takt) 1: Em$/ })).toBeVisible();
    await expect(page.getByText(/has not checked the chords|nie sprawdził akordów/)).toBeVisible();
    await expect(page.getByRole('button', { name: /Approve chords|Zatwierdź akordy/ })).toHaveCount(
      0
    );
    await expect(page.getByText(/Bass and drums|Bas i perkusja/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Practice link|Link do ćwiczenia/ })).toHaveCount(
      0
    );
  });

  test('a student gets no card for a song outside their repertoire', async ({ page, loginAs }) => {
    await loginAs('student');
    await page.goto(`/dashboard/songs/${songs.bare}/card`);
    await expect(page.getByTestId('song-card-empty')).toBeVisible();
  });
});
