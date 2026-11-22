import type { CollectionQuality, RecordQuality } from '@/lib/data-quality/quality.types';

import { fillSuggestionsOf, toStrummyKey, type FillSong } from './fill';
import { FILL_RULE, fillCountsOf, qualityRowsOf } from './quality-list';
import { makeSong } from './repertoire-song.fixture';

const EMPTY: FillSong = {
  tempo: null,
  key: null,
  chords: null,
  lyrics_with_chords: null,
  capo_fret: 0,
};
const MEASURED = { bpm: 86.6, key: 'Ebm', keyStrength: 0.9, chords: ['Ebm', 'B', 'F#', 'B'] };

describe('fillSuggestionsOf', () => {
  it('proposes the tempo, the key and the chords of an empty song', () => {
    expect(fillSuggestionsOf(EMPTY, MEASURED)).toEqual([
      { field: 'tempo', value: 87 },
      { field: 'key', value: 'D#m' },
      { field: 'chords', value: 'Ebm, B, F#' },
    ]);
    expect(fillSuggestionsOf(EMPTY, null)).toEqual([]);
  });

  it('never overwrites a value, but treats the old "C" default and an impossible tempo as empty', () => {
    expect(
      fillSuggestionsOf({ ...EMPTY, tempo: 90, key: 'Em', chords: 'Em, G' }, MEASURED)
    ).toEqual([]);
    const placeholder = fillSuggestionsOf({ ...EMPTY, key: 'C', tempo: 0 }, MEASURED);
    expect(placeholder.map((s) => s.field)).toEqual(['tempo', 'key', 'chords']);
    expect(
      fillSuggestionsOf({ ...EMPTY, lyrics_with_chords: '[G] la' }, MEASURED).map((s) => s.field)
    ).toEqual(['tempo', 'key']);
  });

  it('skips the key and chords under a capo, and an unsure key', () => {
    expect(fillSuggestionsOf({ ...EMPTY, capo_fret: 2 }, MEASURED)).toEqual([
      { field: 'tempo', value: 87 },
    ]);
    expect(fillSuggestionsOf(EMPTY, { ...MEASURED, keyStrength: 0.4 }).map((s) => s.field)).toEqual(
      ['tempo', 'chords']
    );
  });

  it('spells measured keys the way Strummy stores them', () => {
    expect(['Bb', 'Abm', 'F#', 'Db', 'Cm', 'Fb'].map(toStrummyKey)).toEqual([
      'A#',
      'G#m',
      'F#',
      'C#',
      'Cm',
      null,
    ]);
  });
});

describe('qualityRowsOf', () => {
  const record = (id: string, score: number, failedRuleIds: string[]): RecordQuality => ({
    id,
    score,
    band: score >= 80 ? 'good' : 'fair',
    failedRuleIds,
    hasCriticalFailure: false,
  });
  const quality = {
    records: [record('a', 90, []), record('b', 60, ['song.key']), record('c', 70, ['song.key'])],
  } as CollectionQuality;
  const suggestions = new Map([['a', [{ field: 'tempo' as const, value: 90 }]]]);
  const songs = [makeSong('a', { students: 1 }), makeSong('b'), makeSong('c', { students: 3 })];

  it('lists songs with a broken rule or a suggestion, most students first, then lowest score', () => {
    expect(qualityRowsOf({ quality, suggestions }, songs, null).map((row) => row.song.id)).toEqual([
      'c',
      'a',
      'b',
    ]);
    expect(
      qualityRowsOf({ quality, suggestions }, songs, 'song.key').map((row) => row.song.id)
    ).toEqual(['c', 'b']);
    expect(
      qualityRowsOf({ quality, suggestions }, songs, FILL_RULE).map((row) => row.song.id)
    ).toEqual(['a']);
  });

  it('counts the songs and values the recordings can fill', () => {
    expect(fillCountsOf(suggestions)).toEqual({ songs: 1, values: 1 });
  });
});
