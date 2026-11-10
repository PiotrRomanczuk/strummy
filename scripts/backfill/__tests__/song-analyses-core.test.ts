/**
 * @jest-environment node
 */
import {
  analysisRow,
  durationMatches,
  mainChords,
  mergeFilledFields,
  planFill,
  type AnalysisSource,
  type SongAnalysisDocument,
  type SongRow,
} from '../song-analyses-core';
import { keyAgreement, musicKey } from '../song-analyses-keys';

const analysis: SongAnalysisDocument = {
  tool: 'song2logic 0.1.0',
  duration_s: 238.9,
  grid: {
    bpm: 136.36,
    beats_per_bar: 4,
    beats_s: Array.from({ length: 546 }, (_, i) => i * 0.44),
    dropped_beats: 2,
  },
  key: { tonic: 'D', scale: 'major', strength: 0.83 },
  tuning_cents: -10,
  harmony: {
    vocabulary: [
      { chord: 'D', bars: 64 },
      { chord: 'Em', bars: 60 },
      { chord: 'C', bars: 7 },
      { chord: 'A', bars: 3 },
      { chord: 'Bm', bars: 1 },
    ],
  },
};

const emptySong: SongRow = {
  id: 'song-1',
  key: null,
  tempo: null,
  time_signature: null,
  chords: null,
  youtube_url: null,
  duration_ms: 238000,
};

const source: AnalysisSource = {
  id: 'song-1',
  source_url: 'https://www.youtube.com/watch?v=abc',
  source_title: 'Lady Pank - Mniej niż zero',
  source_duration_s: 239,
};

describe('keyAgreement', () => {
  it.each([
    ['D', 'D', 'same'],
    ['Db', 'C#', 'same'],
    ['A#m', 'Bbm', 'same'],
    ['D', 'Bm', 'relative'],
    ['Em', 'G', 'relative'],
    ['D', 'Dm', 'different'],
    ['E', 'A', 'different'],
  ])('%s vs detected %s is %s', (songKey, detected, expected) => {
    expect(keyAgreement(songKey, detected)).toBe(expected);
  });

  it('says nothing for a song without a key', () => {
    expect(keyAgreement(null, 'D')).toBeNull();
  });
});

describe('musicKey', () => {
  it('spells minor keys like the music_key enum', () => {
    expect(musicKey({ tonic: 'Eb', scale: 'minor', strength: 0.7 })).toBe('Ebm');
    expect(musicKey(analysis.key)).toBe('D');
  });

  it('uses G#m for A-flat minor, which the enum does not have', () => {
    expect(musicKey({ tonic: 'Ab', scale: 'minor', strength: 0.7 })).toBe('G#m');
    expect(musicKey({ tonic: 'Ab', scale: 'major', strength: 0.7 })).toBe('Ab');
  });
});

describe('mergeFilledFields', () => {
  it('keeps what an earlier run filled when a re-run fills nothing', () => {
    expect(mergeFilledFields(['tempo', 'chords'], [])).toEqual(['chords', 'tempo']);
    expect(mergeFilledFields(null, ['youtube_url'])).toEqual(['youtube_url']);
    expect(mergeFilledFields(['tempo'], ['tempo', 'chords'])).toEqual(['chords', 'tempo']);
  });
});

describe('durationMatches', () => {
  it('allows 4 % or 6 s, whichever is more', () => {
    expect(durationMatches(238000, 239)).toBe(true);
    expect(durationMatches(238000, 247)).toBe(true);
    expect(durationMatches(238000, 250)).toBe(false);
    expect(durationMatches(60000, 66)).toBe(true);
    expect(durationMatches(60000, 67)).toBe(false);
  });

  it('cannot tell without both lengths', () => {
    expect(durationMatches(null, 239)).toBeNull();
    expect(durationMatches(238000, undefined)).toBeNull();
  });
});

describe('mainChords', () => {
  it('keeps chords by use and drops the ones heard in passing', () => {
    expect(mainChords(analysis)).toEqual(['D', 'Em', 'C']);
  });

  it('is empty for an analysis without harmony', () => {
    expect(mainChords({ ...analysis, harmony: null })).toEqual([]);
  });
});

describe('planFill', () => {
  it('fills every empty column of a matching recording', () => {
    expect(planFill(emptySong, analysis, source)).toEqual({
      tempo: 136,
      time_signature: 4,
      chords: 'D, Em, C',
      youtube_url: 'https://www.youtube.com/watch?v=abc',
    });
  });

  it("never overwrites the teacher's values", () => {
    const song = {
      ...emptySong,
      tempo: 140,
      chords: 'Em D',
      youtube_url: 'https://youtu.be/own',
      time_signature: 4,
    };
    expect(planFill(song, analysis, source)).toEqual({});
  });

  it('fills nothing when the recording is not as long as the song, or the song has no length', () => {
    expect(planFill(emptySong, analysis, { ...source, source_duration_s: 301 })).toEqual({});
    expect(planFill({ ...emptySong, duration_ms: null }, analysis, source)).toEqual({});
  });

  it('leaves the metre empty when bars came out as two beats', () => {
    const halfBars = { ...analysis, grid: { ...analysis.grid, beats_per_bar: 2 } };
    expect(planFill(emptySong, halfBars, source).time_signature).toBeUndefined();
  });

  it('leaves the tempo empty when many double beats were rejected', () => {
    const doubled = { ...analysis, grid: { ...analysis.grid, dropped_beats: 200 } };
    const fill = planFill(emptySong, doubled, source);
    expect(fill.tempo).toBeUndefined();
    expect(fill.chords).toBe('D, Em, C');
  });
});

describe('analysisRow', () => {
  it('records what was detected, how it relates to the song, and which columns were filled', () => {
    const song = { ...emptySong, key: 'Bm', tempo: 140 };
    const row = analysisRow(song, analysis, source, planFill(song, analysis, source));

    expect(row).toMatchObject({
      song_id: 'song-1',
      tool: 'song2logic 0.1.0',
      source_duration_ms: 239000,
      duration_matches: true,
      bpm: 136.36,
      beats_per_bar: 4,
      key: 'D',
      key_agreement: 'relative',
      tuning_cents: -10,
      chords: ['D', 'Em', 'C'],
      filled_fields: ['chords', 'time_signature', 'youtube_url'],
    });
    expect(row.analysis).toBe(analysis);
  });
});
