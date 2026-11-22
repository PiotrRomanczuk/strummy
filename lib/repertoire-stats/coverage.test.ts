import { arrangementOf } from './arrangement';
import { beatsPerBarOf, coverageOf } from './coverage';
import { FEW_SONGS, keyDistribution, numericDistribution } from './distributions';
import { makeSong, TRACK_STATS } from './repertoire-song.fixture';

describe('coverageOf', () => {
  const songs = [
    makeSong('done', { stats: TRACK_STATS }),
    makeSong('waiting', { students: 1 }),
    makeSong('elsewhere', { song: { youtube_url: null } }),
    makeSong('unanalysed', { analysis: null, students: 3 }),
    makeSong('nothing', { song: { youtube_url: null }, analysis: null }),
  ];

  it('counts each pipeline step and the analyses of songs without a link', () => {
    expect(coverageOf(songs)).toMatchObject({
      total: 5,
      withLink: 3,
      withAnalysis: 3,
      withTranscription: 1,
      analysedWithoutLink: 1,
      incomplete: 4,
    });
  });

  it('files each incomplete song once, under the first step it misses, most students first', () => {
    const { gaps } = coverageOf(songs);
    expect(gaps.recording.map((song) => song.id)).toEqual(['nothing']);
    expect(gaps.analysis.map((song) => song.id)).toEqual(['unanalysed']);
    expect(gaps.transcription.map((song) => song.id)).toEqual(['waiting', 'elsewhere']);
  });

  it('counts beats per bar of the analysed songs, most common first', () => {
    const metres = [
      makeSong('a'),
      makeSong('b'),
      makeSong('c', { analysis: { beats_per_bar: 3 } }),
    ];
    expect(beatsPerBarOf(metres)).toEqual([
      { beats: 4, songs: 2 },
      { beats: 3, songs: 1 },
    ]);
  });
});

describe('numericDistribution', () => {
  const tempos = (bpms: number[]) => bpms.map((bpm, i) => makeSong(`t${i}`, { analysis: { bpm } }));

  it('describes few songs as points and a count of the others', () => {
    const few = numericDistribution('tempo', tempos([80, 90, 100, 110]), 't2');
    expect(few).toMatchObject({ total: 4, isFew: true, bins: [] });
    expect(few.selected).toEqual({ value: 100, standing: { kind: 'count', count: 2, of: 3 } });
  });

  it('describes many songs as bins and a percentage', () => {
    const bpms = Array.from({ length: FEW_SONGS }, (_, i) => 60 + i * 2);
    const many = numericDistribution('tempo', tempos(bpms), 't15');
    expect(many.isFew).toBe(false);
    expect(many.bins.find((bin) => bin.isSelected)?.low).toBe(90);
    expect(many.selected?.standing).toEqual({ kind: 'share', percent: 52 });
  });

  it('names the extremes instead of 0% or 100%', () => {
    expect(numericDistribution('tempo', tempos([80, 90, 100]), 't2').selected?.standing).toEqual({
      kind: 'top',
    });
    expect(numericDistribution('tempo', tempos([80, 90, 100]), 't0').selected?.standing).toEqual({
      kind: 'bottom',
    });
  });

  it('reads the lowest vocal note downwards: lower than the others is the top', () => {
    const low = (note: number, id: string) =>
      makeSong(id, { stats: { Wokal: { ...TRACK_STATS.Wokal, low: note } } });
    const result = numericDistribution('vocalLow', [low(40, 'a'), low(50, 'b'), low(60, 'c')], 'a');
    expect(result.selected?.standing).toEqual({ kind: 'top' });
  });
});

describe('keyDistribution', () => {
  it('counts major and minor per pitch class and how many others share the key, never a percentile', () => {
    const songs = ['Ebm', 'Ebm', 'Eb', 'F#'].map((key, i) =>
      makeSong(`k${i}`, { analysis: { key } })
    );
    const keys = keyDistribution(songs, 'k0');
    expect(keys.cells[3]).toEqual({ pitch: 3, major: 1, minor: 2 });
    expect(keys.selected).toEqual({ pitch: 3, isMinor: true, others: 1 });
  });
});

describe('arrangementOf', () => {
  it('profiles every track of the selected songs against the transcribed repertoire', () => {
    const quiet = makeSong('q', { stats: { Wokal: TRACK_STATS.Wokal } });
    const full = makeSong('f', { stats: TRACK_STATS });
    const [vocals, bass, , , kick] = arrangementOf([quiet, full], [quiet, full]);
    expect(vocals).toMatchObject({ track: 'Wokal', isPitched: true, repertoireRange: [52, 69] });
    expect(bass.songs[0]).toBeNull();
    expect(bass.songs[1]).toMatchObject({ perBar: 3.1, activeShare: 0.9 });
    expect(kick).toMatchObject({ isPitched: false, repertoireRange: null, songs: [null, null] });
  });
});
