/**
 * @jest-environment node
 */
import { planSegments } from '../song-segments-core';
import type { SongRow } from '../song-transcriptions-core';

const URL = 'https://www.youtube.com/watch?v=Y7C21yNsw2g';
const RIFF = [{ slot: 0, sixteenths: 8, note: 'E2', degree: '1' }];

const part = (n: number, overrides: Record<string, unknown> = {}) => ({
  n,
  label: 'A',
  name: 'verse',
  repeat_of: n === 1 ? null : 1,
  first_bar: 1 + (n - 1) * 4,
  bars: 4,
  start_s: (n - 1) * 8,
  end_s: n * 8,
  bpm: 120,
  vocals: true,
  chords: ['Em', 'G', 'Em', 'G'],
  roman: ['vi', 'I', 'vi', 'I'],
  loop: ['vi', 'I'],
  bass: {
    pattern: 'X...............',
    notes_per_bar: 1,
    lowest: 'E2',
    highest: 'E2',
    riff: RIFF,
    riff_share: 1,
    bars: [RIFF, RIFF, [], RIFF],
  },
  drums: {
    patterns: { Stopa: 'X.......X.......' },
    kick: 'one_and_three',
    snare: null,
    cymbal: null,
    fills: [4],
  },
  levels: { Bas: -18.2 },
  ...overrides,
});

const file = (overrides: Record<string, unknown> = {}) => ({
  version: 1,
  recording_url: URL,
  tool: 'song2logic study (strummy-segments 1)',
  created: '2026-11-17',
  key: 'G major',
  bpm: 120,
  feel: 'straight',
  felt_bpm: 120,
  beats_per_bar: 4,
  form: ['verse', 'verse'],
  segments: [part(1), part(2, { bass: null, drums: null })],
  ...overrides,
});

const song = (overrides: Partial<SongRow> = {}): SongRow => ({
  id: 's1',
  youtube_url: URL,
  deleted_at: null,
  ...overrides,
});

const LINE = { id: 's1', status: 'ok' };

describe('planSegments', () => {
  it('builds the row with the bass of every bar moved out of the parts', () => {
    const planned = planSegments(LINE, file(), song());
    expect(planned.skip).toBeNull();
    expect(planned.row).toMatchObject({
      song_id: 's1',
      recording_url: URL,
      tool_version: 'song2logic study (strummy-segments 1)',
      analysed_on: '2026-11-17',
      song_key: 'G major',
      bpm: 120,
      feel: 'straight',
      felt_bpm: 120,
      beats_per_bar: 4,
      part_count: 2,
      bass_bars: [[RIFF, RIFF, [], RIFF], null],
    });
    const parts = planned.row?.parts as { bass: Record<string, unknown> | null; loop: string[] }[];
    expect(parts[0].bass).toEqual({
      pattern: 'X...............',
      notes_per_bar: 1,
      lowest: 'E2',
      highest: 'E2',
      riff: RIFF,
      riff_share: 1,
    });
    expect(parts[0].loop).toEqual(['vi', 'I']);
    expect(parts[1].bass).toBeNull();
  });

  it('loads a song that has no link of its own', () => {
    expect(planSegments(LINE, file(), song({ youtube_url: null })).skip).toBeNull();
  });

  it.each([
    ['invalid', file({ segments: [] }), song()],
    ['invalid', file({ version: 2 }), song()],
    ['invalid', file({ segments: [part(1, { chords: 'Em G' })] }), song()],
    ['deleted', file(), song({ deleted_at: '2026-11-01T00:00:00Z' })],
    ['other_recording', file(), song({ youtube_url: 'https://youtu.be/dQw4w9WgXcQ' })],
  ])('skips %s segments with the reason', (skip, document, row) => {
    const planned = planSegments(LINE, document, row);
    expect(planned.skip).toBe(skip);
    expect(planned.row).toBeNull();
  });
});
