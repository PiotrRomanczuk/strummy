/**
 * Pure rules of the song-analysis backfill: what a song2logic `analysis.json` says about a song, and which empty
 * `songs` columns it may fill. No I/O here — see 2026-11-song-analyses.ts.
 */

import { keyAgreement, musicKey } from './song-analyses-keys';

/** The parts of song2logic's analysis.json the backfill reads. */
export interface SongAnalysisDocument {
  tool: string;
  duration_s: number;
  grid: { bpm: number; beats_per_bar: number; beats_s: number[]; dropped_beats: number };
  key: { tonic: string; scale: string; strength: number };
  tuning_cents?: number;
  harmony?: { vocabulary: { chord: string; bars: number }[] } | null;
}

/** One line of the batch's results file. */
export interface AnalysisSource {
  id: string;
  source_url?: string;
  source_title?: string;
  source_duration_s?: number;
  error?: string;
}

export interface SongRow {
  id: string;
  key: string | null;
  tempo: number | null;
  time_signature: number | null;
  chords: string | null;
  youtube_url: string | null;
  duration_ms: number | null;
}

export type FillableField = 'tempo' | 'time_signature' | 'chords' | 'youtube_url';
export type SongFill = Partial<Pick<SongRow, FillableField>>;

// The recording counts as the song when its length is within 4 % or 6 s of songs.duration_ms.
const DURATION_TOLERANCE = 0.04;
const DURATION_TOLERANCE_MS = 6000;
// A chord heard in fewer bars than this share of the song (and fewer than MIN_CHORD_BARS) is a passing error.
const MIN_CHORD_SHARE = 0.03;
const MIN_CHORD_BARS = 2;
// More rejected double beats than this share of the grid means the tracker heard eighths: tempo may be 2x off.
const MAX_DROPPED_BEAT_SHARE = 0.2;
// A median of 2 beats per bar is the beat tracker splitting 4/4 bars, not a real 2/4 (13 of 94 songs, 2026-11-09).
const TRUSTED_METRES = [3, 4, 6];

/** Columns filled by an earlier run stay recorded when a re-run finds nothing left to fill. */
export function mergeFilledFields(earlier: string[] | null | undefined, now: string[]): string[] {
  return [...new Set([...(earlier ?? []), ...now])].sort();
}

export function durationMatches(
  songDurationMs: number | null,
  sourceDurationS?: number
): boolean | null {
  if (!songDurationMs || !sourceDurationS) return null;
  const slack = Math.max(DURATION_TOLERANCE * songDurationMs, DURATION_TOLERANCE_MS);
  return Math.abs(sourceDurationS * 1000 - songDurationMs) <= slack;
}

/** The song's chords by use, without the ones heard only in passing. */
export function mainChords(analysis: SongAnalysisDocument): string[] {
  const vocabulary = analysis.harmony?.vocabulary ?? [];
  const totalBars = vocabulary.reduce((sum, use) => sum + use.bars, 0);
  const minBars = Math.max(MIN_CHORD_BARS, MIN_CHORD_SHARE * totalBars);
  return vocabulary.filter((use) => use.bars >= minBars).map((use) => use.chord);
}

/**
 * Values for the song's EMPTY columns only. Nothing is filled unless the analysed recording is as long as the
 * song (so a live version or a cover never writes into the song).
 */
export function planFill(
  song: SongRow,
  analysis: SongAnalysisDocument,
  source: AnalysisSource
): SongFill {
  if (durationMatches(song.duration_ms, source.source_duration_s) !== true) return {};
  const fill: SongFill = {};
  const { grid } = analysis;
  const isTempoTrusted = grid.dropped_beats <= MAX_DROPPED_BEAT_SHARE * grid.beats_s.length;
  if (song.tempo === null && isTempoTrusted) fill.tempo = Math.round(grid.bpm);
  if (song.time_signature === null && TRUSTED_METRES.includes(grid.beats_per_bar)) {
    fill.time_signature = grid.beats_per_bar;
  }
  const chords = mainChords(analysis);
  if (!song.chords?.trim() && chords.length > 0) fill.chords = chords.join(', ');
  if (!song.youtube_url?.trim() && source.source_url) fill.youtube_url = source.source_url;
  return fill;
}

/** The `song_analyses` row for one analysed song. */
export function analysisRow(
  song: SongRow,
  analysis: SongAnalysisDocument,
  source: AnalysisSource,
  fill: SongFill
) {
  const key = musicKey(analysis.key);
  return {
    song_id: song.id,
    tool: analysis.tool,
    source_url: source.source_url ?? null,
    source_title: source.source_title ?? null,
    source_duration_ms: source.source_duration_s
      ? Math.round(source.source_duration_s * 1000)
      : null,
    duration_matches: durationMatches(song.duration_ms, source.source_duration_s),
    bpm: analysis.grid.bpm,
    beats_per_bar: analysis.grid.beats_per_bar,
    key,
    key_strength: analysis.key.strength,
    key_agreement: keyAgreement(song.key, key),
    tuning_cents: analysis.tuning_cents ?? null,
    chords: mainChords(analysis),
    analysis,
    filled_fields: Object.keys(fill).sort(),
  };
}
