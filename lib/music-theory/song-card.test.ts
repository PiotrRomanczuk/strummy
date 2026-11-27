import { songCardFromRows } from '@/lib/services/song-card-queries';

import { buildSongCard, cardBars, youtubeId } from './song-card';
import { CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW } from './song-card.fixture';

describe('youtubeId', () => {
  it.each([
    'https://www.youtube.com/watch?v=bO28lB1uwp4',
    'https://youtu.be/bO28lB1uwp4',
    'https://www.youtube.com/embed/bO28lB1uwp4?start=3',
    'https://music.youtube.com/watch?list=x&v=bO28lB1uwp4',
    'https://www.youtube.com/shorts/bO28lB1uwp4',
  ])('reads %s', (url) => expect(youtubeId(url)).toBe('bO28lB1uwp4'));

  it('is null for another site or no link', () => {
    expect(youtubeId('https://open.spotify.com/track/1')).toBeNull();
    expect(youtubeId(null)).toBeNull();
  });
});

describe('cardBars', () => {
  it('times each bar from downbeat to downbeat and the last to the end of the recording', () => {
    const bars = cardBars(CARD_ANALYSIS_ROW.grid, CARD_ANALYSIS_ROW.chords, 20);
    expect(bars).toHaveLength(9);
    expect(bars[0]).toEqual({ start: 0.6, end: 2.68, halves: ['Am', 'Am'] });
    expect(bars[8]).toEqual({ start: 17.16, end: 20, halves: ['F', 'G'] });
  });

  it('takes every bar-first beat when an older analysis has no downbeats', () => {
    const grid = { bpm: 120, beats_per_bar: 2, beats_s: [0.5, 1, 1.5, 2, 2.5] };
    expect(cardBars(grid, [{ bar: 2, chord: 'D' }], 3)).toEqual([
      { start: 0.5, end: 1.5, halves: ['N', 'N'] },
      { start: 1.5, end: 2.5, halves: ['D', 'D'] },
      { start: 2.5, end: 3, halves: ['N', 'N'] },
    ]);
  });
});

describe('songCardFromRows', () => {
  it('builds the whole card from an analysis and the parts of the same recording', () => {
    const card = songCardFromRows(CARD_ANALYSIS_ROW, CARD_SEGMENTS_ROW);
    expect(card).toMatchObject({
      duration: 20,
      beatsPerBar: 4,
      key: { tonic: 'C', isMinor: false },
      strum: 'X.X.X.X.X.X.X.X.',
      capo: { fret: 5 },
      youtubeId: 'bO28lB1uwp4',
      analysedOn: '2026-11-22',
    });
    expect(card?.parts.map((p) => [p.kind, p.ordinal, p.firstBar, p.start, p.group])).toEqual([
      ['intro', 1, 0, 0, 'intro:vi-IV-I'],
      ['verse', 1, 3, 6.8, 'verse:I'],
      ['chorus', 1, 8, 17.16, 'chorus:IV'],
    ]);
    expect(card?.parts[1].bass?.[0][0].note).toBe('C2');
    expect(card?.parts[0].bass).toBeNull();
  });

  it('writes a minor song`s degrees against its own tonic (#1242)', () => {
    const [intro, ...rest] = CARD_SEGMENTS_ROW.parts;
    const minorIntro = { ...intro, roman: ['i', 'bVI', 'bIII'], loop: ['i', 'bVI', 'bIII'] };
    const card = songCardFromRows(
      { ...CARD_ANALYSIS_ROW, key: { tonic: 'A', scale: 'minor' } },
      { ...CARD_SEGMENTS_ROW, parts: [minorIntro, ...rest] }
    );
    expect(card?.parts[0]).toMatchObject({
      roman: ['i', 'VI', 'III'],
      loop: ['i', 'VI', 'III'],
      group: 'intro:i-VI-III',
    });
  });

  it('leaves the parts out when they were heard in another recording', () => {
    const other = { ...CARD_SEGMENTS_ROW, recording_url: 'https://youtu.be/AAAAAAAAAAA' };
    const card = songCardFromRows(CARD_ANALYSIS_ROW, other);
    expect(card?.parts).toEqual([]);
    expect(card?.bars).toHaveLength(9);
  });

  it('leaves out parts that do not fit the schema, keeps the rest', () => {
    const broken = { ...CARD_SEGMENTS_ROW, parts: [{ n: 1 }] };
    expect(songCardFromRows(CARD_ANALYSIS_ROW, broken)?.parts).toEqual([]);
    expect(songCardFromRows(CARD_ANALYSIS_ROW, null)?.parts).toEqual([]);
  });

  it('is null without an analysis or with one the card cannot read', () => {
    expect(songCardFromRows(null, CARD_SEGMENTS_ROW)).toBeNull();
    expect(songCardFromRows({ ...CARD_ANALYSIS_ROW, grid: null }, null)).toBeNull();
  });

  it('shows what an older analysis has: no strum, no capo, no chords', () => {
    const old = { ...CARD_ANALYSIS_ROW, chords: null, rhythm: null, capo: null };
    expect(songCardFromRows(old, null)).toMatchObject({ strum: null, capo: null, parts: [] });
  });
});

describe('buildSongCard', () => {
  it('ignores a capo on fret 0 and a strum that is not one bar of sixteenths', () => {
    const card = buildSongCard({
      sourceUrl: null,
      analysedOn: null,
      duration: null,
      grid: CARD_ANALYSIS_ROW.grid,
      key: null,
      chords: [],
      rhythm: [{ track: 'Gitara', pattern: 'X.X.' }],
      capo: { fret: 0, shapes: {} },
      segments: null,
    });
    expect(card).toMatchObject({
      capo: null,
      strum: null,
      key: null,
      youtubeId: null,
      duration: 2.16,
    });
  });
});
