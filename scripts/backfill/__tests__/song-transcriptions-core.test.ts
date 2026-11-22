/**
 * @jest-environment node
 */
import {
  isSameRecording,
  planTranscription,
  trackStats,
  youtubeId,
  type SongRow,
} from '../song-transcriptions-core';

const URL = 'https://www.youtube.com/watch?v=Y7C21yNsw2g';
const BASS: [number, number, number, number, number, number][] = [
  [0.4, 0.2, 38, 70, 0, 0],
  [0.5, 0.25, 40, 90, 1, 0],
  [1.0, 0.25, 43, 80, 1, 8],
  [2.6, 0.5, 45, 85, 2, 0],
];

const file = (overrides: Record<string, unknown> = {}) => ({
  version: 1,
  recording_url: URL,
  created: '2026-11-15',
  tool: 'song2logic study (strummy-notes 1)',
  columns: ['start_s', 'seconds', 'pitch', 'velocity', 'bar', 'slot'],
  grid: { bpm: 120, beats_per_bar: 4, downbeats_s: [0.5, 2.5, 4.5, 6.5] },
  tracks: { Bas: BASS, Wokal: [] },
  ...overrides,
});

const song = (overrides: Partial<SongRow> = {}): SongRow => ({
  id: 's1',
  youtube_url: URL,
  deleted_at: null,
  ...overrides,
});

const LINE = { id: 's1', status: 'ok' };

describe('youtubeId / isSameRecording', () => {
  it('reads the video id from any YouTube link form', () => {
    expect(youtubeId('https://youtu.be/Y7C21yNsw2g?t=3')).toBe('Y7C21yNsw2g');
    expect(youtubeId('https://music.youtube.com/watch?v=Y7C21yNsw2g&list=x')).toBe('Y7C21yNsw2g');
    expect(youtubeId('https://open.spotify.com/track/abc')).toBeNull();
  });

  it('accepts a song without a link and refuses another video', () => {
    expect(isSameRecording(null, URL)).toBe(true);
    expect(isSameRecording('  ', URL)).toBe(true);
    expect(isSameRecording('https://youtu.be/Y7C21yNsw2g', URL)).toBe(true);
    expect(isSameRecording('https://www.youtube.com/watch?v=dQw4w9WgXcQ', URL)).toBe(false);
  });
});

describe('trackStats', () => {
  it('counts notes, range, median, density and the share of bars with notes', () => {
    expect(trackStats(BASS, 4)).toEqual({
      notes: 4,
      low: 38,
      high: 45,
      median: 41.5,
      per_bar: 1,
      active_share: 0.5, // bars 1 and 2 of 4; bar 0 (before the first downbeat) is not a bar
    });
  });

  it('gives an empty track no range', () => {
    expect(trackStats([], 4)).toEqual({
      notes: 0,
      low: null,
      high: null,
      median: null,
      per_bar: 0,
      active_share: 0,
    });
  });
});

describe('planTranscription', () => {
  it('builds the row with every track kept whole and its stats', () => {
    const planned = planTranscription(LINE, file(), song());
    expect(planned.skip).toBeNull();
    expect(planned.row).toMatchObject({
      song_id: 's1',
      recording_url: URL,
      tool_version: 'song2logic study (strummy-notes 1)',
      transcribed_on: '2026-11-15',
      note_count: 4,
      tracks: { Bas: BASS, Wokal: [] },
      grid: { bpm: 120, beats_per_bar: 4, downbeats_s: [0.5, 2.5, 4.5, 6.5] },
    });
    expect(planned.row?.stats).toMatchObject({ Bas: { notes: 4 }, Wokal: { notes: 0 } });
  });

  it('loads a song that has no link of its own', () => {
    expect(planTranscription(LINE, file(), song({ youtube_url: null })).skip).toBeNull();
  });

  it.each([
    ['invalid', file({ columns: ['start_s', 'pitch'] }), song()],
    ['invalid', file({ grid: { bpm: 120, beats_per_bar: 4, downbeats_s: [] } }), song()],
    ['deleted', file(), song({ deleted_at: '2026-11-01T00:00:00Z' })],
    ['other_recording', file(), song({ youtube_url: 'https://youtu.be/dQw4w9WgXcQ' })],
  ])('skips a %s transcription with the reason', (skip, document, row) => {
    const planned = planTranscription(LINE, document, row);
    expect(planned.skip).toBe(skip);
    expect(planned.row).toBeNull();
  });
});
