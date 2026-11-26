/**
 * `song_card_for_student` (SNG-17, migration 20261123210000): the one way a student reads a song card. It answers
 * only for a song of the caller's own repertoire (staff: any song) and leaves out the teacher's material —
 * degrees, bass, drums, levels, other tracks' rhythm, the capo advice.
 */

import { describeIfRls, seedTwoTeachers, type TwoTeacherFixture } from '../index';

const DOWNBEATS = [0.5, 2.5, 4.5, 6.5];
const ANALYSIS = {
  tool: 'rls',
  source_url: 'https://www.youtube.com/watch?v=Y7C21yNsw2g',
  analysis: {
    duration_s: 9,
    grid: { bpm: 120, beats_per_bar: 4, beats_s: DOWNBEATS, downbeats_s: DOWNBEATS },
    key: { tonic: 'G', scale: 'major' },
    chords: [{ bar: 1, chord: 'G' }],
    rhythm: [
      { track: 'Gitara', pattern: 'X.X.X.X.X.X.X.X.' },
      { track: 'Bas', pattern: 'X.......X.......' },
    ],
    harmony: { capo: { fret: 2, shapes: { G: 'F' } } },
  },
};
const PART = {
  n: 1,
  label: 'A',
  name: 'verse',
  repeat_of: null,
  first_bar: 1,
  bars: 4,
  start_s: 0.5,
  end_s: 8.5,
  bpm: 120,
  vocals: true,
  chords: ['G', 'G', 'G', 'G'],
  roman: ['I', 'I', 'I', 'I'],
  loop: ['I'],
  bass: {
    pattern: 'X...............',
    notes_per_bar: 1,
    lowest: 'G2',
    highest: 'G2',
    riff: [],
    riff_share: 0,
  },
  drums: {
    patterns: { Werbel: '....X.......X...' },
    kick: null,
    snare: 'backbeat',
    cymbal: null,
    fills: [],
  },
  levels: { Gitara: -20 },
};

describeIfRls('song_card_for_student — own repertoire only, teacher material left out', () => {
  let fx: TwoTeacherFixture;
  let inRepertoire: string;
  let elsewhere: string;

  beforeAll(async () => {
    fx = await seedTwoTeachers();
    inRepertoire = await fx.seedSong('card-student-own');
    elsewhere = await fx.seedSong('card-student-other');
    for (const songId of [inRepertoire, elsewhere]) {
      const analysis = await fx.service
        .from('song_analyses')
        .insert({ song_id: songId, ...ANALYSIS });
      if (analysis.error) throw new Error(`insert song_analyses failed: ${analysis.error.message}`);
      const segments = await fx.service.from('song_segments').insert({
        song_id: songId,
        recording_url: ANALYSIS.source_url,
        tool_version: 'rls',
        song_key: 'G major',
        bpm: 120,
        feel: 'straight',
        felt_bpm: 120,
        beats_per_bar: 4,
        part_count: 1,
        parts: [PART],
        bass_bars: [[[{ slot: 0, sixteenths: 4, note: 'G2', degree: '1' }]]],
      });
      if (segments.error) throw new Error(`insert song_segments failed: ${segments.error.message}`);
    }
    const repertoire = await fx.service
      .from('student_repertoire')
      .insert({ student_id: fx.studentA1.id, song_id: inRepertoire });
    if (repertoire.error) throw new Error(`insert repertoire failed: ${repertoire.error.message}`);
  }, 30_000);

  afterAll(async () => {
    await fx?.cleanup();
  });

  it('gives the student the card of a repertoire song without the teacher material', async () => {
    const { data, error } = await fx.studentA1.client.rpc('song_card_for_student', {
      p_song_id: inRepertoire,
    });
    expect(error).toBeNull();
    const card = data as {
      analysis: { rhythm: { track: string }[]; capo: null; grid: object };
      segments: { parts: Record<string, unknown>[]; bass_bars: unknown[] };
    };
    expect(card.analysis.grid).toBeTruthy();
    expect(card.analysis.rhythm.map((r) => r.track)).toEqual(['Gitara']);
    expect(card.analysis.capo).toBeNull();
    expect(card.segments.parts[0]).toMatchObject({
      name: 'verse',
      loop: ['I'],
      roman: [],
      bass: null,
      drums: null,
      levels: {},
    });
    expect(card.segments.bass_bars).toEqual([null]);
  });

  it('gives the student nothing for a song outside the repertoire, a teacher any song', async () => {
    const student = await fx.studentA1.client.rpc('song_card_for_student', {
      p_song_id: elsewhere,
    });
    expect(student.error).toBeNull();
    expect(student.data).toBeNull();
    const teacher = await fx.teacherB.client.rpc('song_card_for_student', { p_song_id: elsewhere });
    expect(teacher.data).not.toBeNull();
  });
});
