import { chordNames, chordShare, chordShift, knownChords } from './chord-agreement';
import { fieldMarksOf, mismatchListOf } from './mismatch-list';
import { mismatchesOf } from './mismatches';
import { makeSong } from './repertoire-song.fixture';

const LITTLE_WING = {
  song: { title: 'Little Wing', key: 'Em', tempo: 70, chords: 'Em, G, Am, Bm, Bb, C, D' },
  analysis: { key: 'F#', bpm: 70, chords: ['F#', 'Ebm', 'Abm', 'C#', 'Bbm', 'B', 'E'] },
};

describe('chord agreement', () => {
  it('reads chord symbols and skips tab lines and words', () => {
    expect(knownChords('Am7, G/B, E7#9, B|--0--|, Bend, Capo:, Bb6sus4').map((c) => c.raw)).toEqual(
      ['Am7', 'G/B', 'E7#9', 'Bb6sus4']
    );
    expect(chordNames('G D G C G D')).toEqual(['G', 'D', 'C']);
  });

  it('compares entered shapes as sounding chords under the capo', () => {
    expect(chordShare('Em, G, D, A', 2, ['F#m', 'A', 'E', 'B'])).toBe(1);
    expect(chordShare('Em, G, D, A', 0, ['F#m', 'A', 'E', 'B'])).toBe(0.25);
    expect(chordShare(null, 0, ['A'])).toBeNull();
  });

  it('finds the shift of a guitar tuned half a step down, and none when the chords agree', () => {
    const { chords } = LITTLE_WING.song;
    expect(chordShift(chords, 0, LITTLE_WING.analysis.chords)).toEqual({ shift: -1, share: 0.86 });
    expect(chordShift('F#m, A, E', 0, ['F#m', 'A', 'E'])).toBeNull();
  });
});

describe('mismatchesOf', () => {
  it('has none when Strummy and the recording agree, or without a measurement', () => {
    expect(mismatchesOf(makeSong('s1'))).toEqual([]);
    expect(mismatchesOf(makeSong('s1', { analysis: null }))).toEqual([]);
  });

  it('explains chords and key by the tuning instead of calling them errors', () => {
    const found = mismatchesOf(makeSong('lw', LITTLE_WING));
    expect(found.map(({ field, reason, detail }) => ({ field, reason, detail }))).toEqual([
      { field: 'key', reason: 'tuning', detail: -1 },
      { field: 'chords', reason: 'tuning', detail: -1 },
    ]);
    expect(found[1].share).toEqual({ asEntered: 0, shifted: 0.86 });
  });

  it('calls a different tempo an error with its change, half or double tempo explained', () => {
    const [tempo] = mismatchesOf(makeSong('z', { song: { tempo: 120 }, analysis: { bpm: 84 } }));
    expect(tempo).toMatchObject({ field: 'tempo', reason: null, detail: -30 });
    const [half] = mismatchesOf(makeSong('w', { song: { tempo: 87 }, analysis: { bpm: 174 } }));
    expect(half).toMatchObject({ field: 'tempo', reason: 'halfDouble' });
  });

  it('explains the key by the capo, the relative key or an unsure detection, otherwise an error', () => {
    const reasonOf = (key: string, measured: string, capo = 0, strength = 0.9) =>
      mismatchesOf(
        makeSong('k', {
          song: { key, capo_fret: capo, chords: null },
          analysis: { key: measured, key_strength: strength },
        })
      ).find((mismatch) => mismatch.field === 'key')?.reason;
    expect(reasonOf('C', 'E', 4)).toBe('capo');
    expect(reasonOf('Em', 'G')).toBe('relative');
    expect(reasonOf('G', 'D', 0, 0.41)).toBe('lowConfidence');
    expect(reasonOf('C', 'A')).toBeNull();
  });

  it('reports a different length with the difference in ms', () => {
    const song = makeSong('h', {
      song: { duration_ms: 279_000 },
      analysis: { duration_matches: false, source_duration_ms: 413_000 },
    });
    expect(mismatchesOf(song)).toEqual([
      expect.objectContaining({
        field: 'duration',
        detail: 134_000,
        entered: '4:39',
        measured: '6:53',
      }),
    ]);
  });
});

describe('mismatchListOf', () => {
  const songs = [
    makeSong('z', { song: { title: 'Zombie', tempo: 120 }, analysis: { bpm: 84 }, students: 2 }),
    makeSong('lw', { ...LITTLE_WING, students: 6 }),
    makeSong('ok', { song: { title: 'Fine' } }),
  ];

  it('puts errors and explained disagreements apart, counting songs per field and reason', () => {
    const list = mismatchListOf(songs, null);
    expect(list.total).toBe(2);
    expect(list.errors.map((row) => row.song.title)).toEqual(['Zombie']);
    expect(list.explained.map((row) => row.mismatch.field)).toEqual(['key', 'chords']);
    expect(list.perField).toEqual({ tempo: 1, key: 1, duration: 0, chords: 1 });
    expect(list.perReason.tuning).toBe(2);
  });

  it('filters one field and keeps the songs most students play first', () => {
    expect(mismatchListOf(songs, 'chords').explained.map((row) => row.song.title)).toEqual([
      'Little Wing',
    ]);
    expect(mismatchListOf(songs, 'tempo').errors).toHaveLength(1);
  });
});

describe('fieldMarksOf', () => {
  it('marks each field: ok, error, explained, review for some chords, nothing without data', () => {
    expect(fieldMarksOf(makeSong('lw', LITTLE_WING))).toEqual({
      tempo: 'ok',
      key: 'explained',
      duration: 'ok',
      chords: 'explained',
    });
    const partly = makeSong('p', { song: { chords: 'F#m, A, E, B, D' } });
    expect(fieldMarksOf(partly).chords).toBe('review');
    expect(fieldMarksOf(makeSong('n', { analysis: null }))).toEqual({
      tempo: null,
      key: null,
      duration: null,
      chords: null,
    });
  });
});
