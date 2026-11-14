/**
 * @jest-environment node
 */
import {
  CHORD_ID_TOOL,
  countPlan,
  hasChordIdChords,
  planSong,
  type ReviewResultLine,
} from '../song-analysis-sources-core';

// A real review from the 2026-11-13 run (Queens of the Stone Age – Make it Wit Chu).
const review = {
  version: 1,
  reference: 'chord-id',
  sources: ['strummy', 'chord-id', 'analyze'],
  sheet_chords: ['C', 'E', 'A'],
  heard_chords: ['C', 'A', 'E5', 'A5', 'Em', 'E'],
  main_chords: ['C', 'A', 'E5', 'A5', 'Em', 'E'],
  status: 'conflict',
  transpose: 0,
  coverage: 0.709,
  capo_hint: null,
  capo_matches: true,
  differences: [
    {
      kind: 'mode',
      audio: 'Em',
      audio_as_written: null,
      sheet: 'E',
      share: 0.242,
      first_s: 58.85,
      confirmed: true,
      analyze: 'audio',
      chordonomicon: null,
    },
  ],
  keys: { analyze: 'Em', 'chord-id': 'Em', sheet: 'E' },
  key_sources_agree: false,
  sounding_key: null,
};

const chordId = {
  name: 'Make It Wit Chu',
  youtube_url: 'https://www.youtube.com/watch?v=abc',
  chords: [
    [0, 'C'],
    [2.4, 'A'],
  ],
};

const line: ReviewResultLine = {
  id: 'song-1',
  status: 'conflict',
  reference: 'chord-id',
  tool: 'song2logic chord-review 1',
};

describe('planSong', () => {
  it('keeps the review and the Chord ID result it was made from, whole', () => {
    const planned = planSong(line, review, chordId);

    expect(planned.problem).toBeNull();
    expect(planned.review?.status).toBe('conflict');
    expect(planned.rows).toEqual([
      { song_id: 'song-1', source: 'chord-compare', tool_version: line.tool, payload: review },
      { song_id: 'song-1', source: 'chord-id', tool_version: CHORD_ID_TOOL, payload: chordId },
    ]);
  });

  it('loads only the review when the song has no Chord ID result', () => {
    const analyzeOnly = { ...review, reference: 'analyze', status: 'check' };
    expect(planSong(line, analyzeOnly, undefined).rows.map((row) => row.source)).toEqual([
      'chord-compare',
    ]);
  });

  it('loads nothing for a review that does not match the schema', () => {
    const planned = planSong(line, { ...review, status: 'maybe' }, chordId);

    expect(planned.rows).toEqual([]);
    expect(planned.problem).toBe('song-1: review does not match the schema (status)');
  });
});

describe('hasChordIdChords', () => {
  it.each([
    [chordId, true],
    [{ error: 'HTTP Error 403' }, false],
    [{ chords: [] }, false],
    [{ chords: [['0', 'C']] }, false],
    [null, false],
  ])('%j → %s', (document, expected) => {
    expect(hasChordIdChords(document)).toBe(expected);
  });
});

describe('countPlan', () => {
  it('counts statuses, invalid reviews and rows per source', () => {
    const counts: Record<string, number> = {};
    countPlan(counts, planSong(line, review, chordId));
    countPlan(counts, planSong(line, { ...review, status: 'agree' }, undefined));
    countPlan(counts, planSong(line, {}, undefined));

    expect(counts).toEqual({
      'status:conflict': 1,
      'status:agree': 1,
      invalid: 1,
      'rows:chord-compare': 2,
      'rows:chord-id': 1,
    });
  });
});
