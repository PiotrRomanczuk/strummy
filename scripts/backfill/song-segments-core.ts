/**
 * Pure rules of the song-segments backfill: a song2logic `strummy-segments` run directory → rows of
 * `song_segments` (SNG-16). No I/O here — see 2026-11-song-segments.ts.
 */

import type { Json } from '@/types/database.types';
import { SegmentsFileSchema } from '@/schemas/SongSegmentsSchema';
import { isSameRecording, type SongRow } from './song-transcriptions-core';

/** One line of the run's results.jsonl; only `ok` lines have a segments file. */
export interface SegmentsResultLine {
  id: string;
  status: string;
  recording_url?: string | null;
  parts?: number;
}

export interface SegmentsRow {
  song_id: string;
  recording_url: string;
  tool_version: string;
  analysed_on: string | null;
  song_key: string;
  bpm: number;
  feel: string;
  felt_bpm: number;
  beats_per_bar: number;
  part_count: number;
  parts: Json;
  bass_bars: Json;
}

export type SegmentsSkip = 'invalid' | 'deleted' | 'other_recording';

export type PlannedSegments =
  { row: SegmentsRow; skip: null } | { row: null; skip: SegmentsSkip; problem: string };

/** The table row of one song's segments file, or why it is not loaded. */
export function planSegments(
  line: SegmentsResultLine,
  file: unknown,
  song: SongRow
): PlannedSegments {
  const parsed = SegmentsFileSchema.safeParse(file);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path.join('.') ?? '';
    const problem = `${line.id}: file does not match the schema (${path})`;
    return { row: null, skip: 'invalid', problem };
  }
  const segments = parsed.data;
  if (song.deleted_at)
    return { row: null, skip: 'deleted', problem: `${line.id}: song is deleted` };
  if (!isSameRecording(song.youtube_url, segments.recording_url)) {
    const problem = `${line.id}: song links ${song.youtube_url}, segments are of ${segments.recording_url}`;
    return { row: null, skip: 'other_recording', problem };
  }
  // The bass of every bar is the heavy half of a part: it goes to its own column, in the parts' order.
  const parts = segments.segments.map(({ bass, ...part }) => {
    if (bass === null) return { ...part, bass: null };
    const { bars: _bars, ...summary } = bass;
    return { ...part, bass: summary };
  });
  const bassBars = segments.segments.map((part) => part.bass?.bars ?? null);
  return {
    row: {
      song_id: line.id,
      recording_url: segments.recording_url,
      tool_version: segments.tool,
      analysed_on: segments.created,
      song_key: segments.key,
      bpm: segments.bpm,
      feel: segments.feel,
      felt_bpm: segments.felt_bpm,
      beats_per_bar: segments.beats_per_bar,
      part_count: parts.length,
      parts: parts as unknown as Json,
      bass_bars: bassBars as unknown as Json,
    },
    skip: null,
  };
}
