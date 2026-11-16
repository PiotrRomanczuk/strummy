import { coverageOf } from './coverage';
import { distributionsOf, keyIndex } from './distributions';
import { chordShare, mismatchesOf, songsWithMismatches } from './mismatches';
import { toRepertoireSong, type RepertoireSong, type SongStatsRow } from './repertoire-song';

const row = (overrides: Partial<SongStatsRow> = {}): SongStatsRow => ({
  id: 's1',
  title: 'Wonderwall',
  author: 'Oasis',
  category: 'Rock',
  tempo: 87,
  key: 'F#m',
  capo_fret: 2,
  duration_ms: 258_000,
  chords: 'Em, G, D, A',
  youtube_url: 'https://youtu.be/bx1Bh8ZvH84',
  ...overrides,
});

const analysis = {
  song_id: 's1',
  bpm: 87.2,
  beats_per_bar: 4,
  key: 'F#m',
  source_duration_ms: 259_000,
  duration_matches: true,
  chords: ['F#m', 'A', 'E', 'B'],
};

const stats = {
  Bas: { notes: 400, low: 30, high: 52, median: 40, per_bar: 3.1, active_share: 0.9 },
  Wokal: { notes: 300, low: 52, high: 69, median: 60, per_bar: 2.3, active_share: 0.6 },
};

const song = (
  id: string,
  overrides: Partial<SongStatsRow> = {},
  measured = true,
  transcribed = true
) =>
  toRepertoireSong(
    row({ id, ...overrides }),
    measured ? { ...analysis, song_id: id } : undefined,
    transcribed ? { song_id: id, note_count: 700, stats } : undefined
  );

describe('toRepertoireSong', () => {
  it('joins the entered values, the measurement and the transcription stats', () => {
    const joined = song('s1');
    expect(joined.entered).toMatchObject({ tempo: 87, key: 'F#m', capo: 2 });
    expect(joined.measured).toMatchObject({
      bpm: 87.2,
      key: 'F#m',
      chords: ['F#m', 'A', 'E', 'B'],
    });
    expect(joined.transcription).toEqual({
      notes: 700,
      bass: { notes: 400, low: 30, high: 52, perBar: 3.1 },
      vocals: { notes: 300, low: 52, high: 69, perBar: 2.3 },
    });
  });

  it('keeps a transcription whose stats no longer parse, without track summaries', () => {
    const joined = toRepertoireSong(row(), undefined, { song_id: 's1', note_count: 5, stats: 'x' });
    expect(joined.transcription).toEqual({ notes: 5, bass: null, vocals: null });
  });
});

describe('coverageOf', () => {
  it('counts each stage and lists what every song lacks, most first', () => {
    const songs = [
      song('a'),
      song('b', { title: 'B', youtube_url: null }, false, false),
      song('c', { title: 'C' }, true, false),
    ];
    const coverage = coverageOf(songs);
    expect(coverage).toMatchObject({
      total: 3,
      withLink: 2,
      withAnalysis: 2,
      withTranscription: 1,
    });
    expect(coverage.missing.map(({ song: s, lacks }) => [s.id, lacks])).toEqual([
      ['b', ['link', 'analysis', 'transcription']],
      ['c', ['transcription']],
    ]);
  });
});

describe('mismatches', () => {
  it('compares shapes under the capo with the sounding chords', () => {
    // Em G D A with capo 2 sound as F#m A E B.
    expect(chordShare('Em, G, D, A', 2, ['F#m', 'A', 'E', 'B'])).toBe(1);
    expect(chordShare('Em, G, D, A', 0, ['F#m', 'A', 'E', 'B'])).toBe(0.25);
    expect(chordShare(null, 0, ['A'])).toBeNull();
  });

  it('accepts a shape key under the capo and flags half tempo, another key and a short recording', () => {
    expect(mismatchesOf(song('s1', { key: 'Em' }))).toEqual([]); // Em + capo 2 = F#m
    const found = mismatchesOf(
      toRepertoireSong(row({ tempo: 174, key: 'C', capo_fret: 0, chords: 'C, F' }), {
        ...analysis,
        duration_matches: false,
      })
    );
    expect(found.map(({ kind, verdict }) => [kind, verdict])).toEqual([
      ['tempo', 'half_double'],
      ['key', 'different'],
      ['duration', 'different'],
      ['chords', '0'],
    ]);
  });

  it('lists only songs that disagree, most disagreements first', () => {
    const songs: RepertoireSong[] = [
      song('ok'),
      song('off', { tempo: 120 }),
      song('none', {}, false),
    ];
    expect(songsWithMismatches(songs).map(({ song: s }) => s.id)).toEqual(['off']);
  });
});

describe('distributionsOf', () => {
  it('reads keys of any spelling', () => {
    expect([keyIndex('C'), keyIndex('A#m'), keyIndex('Bbm'), keyIndex('H')]).toEqual([
      0,
      22,
      22,
      null,
    ]);
  });

  it('bins every measure and marks the selected song with its percentile', () => {
    const songs = [
      song('slow', { tempo: 70 }, false),
      song('mid', { tempo: 95 }, false),
      song('fast', { tempo: 128 }, false),
    ];
    const tempo = distributionsOf(songs, 'mid').find((d) => d.id === 'tempo')!;
    expect(tempo.total).toBe(3);
    expect(tempo.bins.map((bin) => bin.label)).toEqual([
      '70–79',
      '80–89',
      '90–99',
      '100–109',
      '110–119',
      '120–129',
    ]);
    expect(tempo.bins.filter((bin) => bin.isSelected).map((bin) => bin.label)).toEqual(['90–99']);
    expect(tempo.selected).toEqual({ label: '95 BPM', below: 50 });
  });

  it('gives a measure nobody has no bins', () => {
    const vocal = distributionsOf([song('a', {}, false, false)], null).find(
      (d) => d.id === 'vocalHigh'
    )!;
    expect(vocal).toEqual({ id: 'vocalHigh', bins: [], total: 0, selected: null });
  });
});
