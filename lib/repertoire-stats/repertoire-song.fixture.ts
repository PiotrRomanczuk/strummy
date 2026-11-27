/** Builds repertoire songs for the repertoire statistics tests (SNG-13). */

import {
  toRepertoireSong,
  type AnalysisStatsRow,
  type RepertoireSong,
  type SongStatsRow,
} from './repertoire-song';

export const songRow = (overrides: Partial<SongStatsRow> = {}): SongStatsRow => ({
  id: 's1',
  title: 'Wonderwall',
  author: 'Oasis',
  category: 'Rock',
  level: 'beginner',
  tempo: 87,
  key: 'F#m',
  capo_fret: 0,
  duration_ms: 258_000,
  chords: 'F#m, A, E, B',
  youtube_url: 'https://youtu.be/bx1Bh8ZvH84',
  ...overrides,
});

export const analysisRow = (overrides: Partial<AnalysisStatsRow> = {}): AnalysisStatsRow => ({
  song_id: 's1',
  bpm: 87.2,
  beats_per_bar: 4,
  key: 'F#m',
  source_duration_ms: 259_000,
  duration_matches: true,
  chords: ['F#m', 'A', 'E', 'B'],
  key_strength: 0.9,
  capo_fret: 2,
  // As song2logic writes it: against the parallel major (the app shows i III VII IV).
  progressions: [{ roman: ['i', 'bIII', 'bVII', 'IV'], chords: ['F#m', 'A', 'E', 'B'], bars: 16 }],
  ...overrides,
});

export const TRACK_STATS = {
  Bas: { notes: 400, low: 30, high: 52, median: 40, per_bar: 3.1, active_share: 0.9 },
  Wokal: { notes: 300, low: 52, high: 69, median: 60, per_bar: 2.3, active_share: 0.6 },
};

type SongOptions = {
  song?: Partial<SongStatsRow>;
  analysis?: Partial<AnalysisStatsRow> | null;
  stats?: unknown;
  students?: number;
};

/** A song with an analysis by default; `analysis: null` leaves it unmeasured, `stats` adds a transcription. */
export function makeSong(id: string, options: SongOptions = {}): RepertoireSong {
  const { song = {}, analysis = {}, stats, students = 0 } = options;
  return toRepertoireSong(
    songRow({ id, ...song }),
    analysis === null ? undefined : analysisRow({ song_id: id, ...analysis }),
    stats === undefined ? undefined : { song_id: id, note_count: 700, stats },
    students
  );
}
