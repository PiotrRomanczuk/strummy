/**
 * Pure rules of the song-analysis-sources backfill: a song2logic `chord-review` run directory → rows of
 * `song_analysis_sources`. No I/O here — see 2026-11-song-analysis-sources.ts.
 */

import type { Json } from '@/types/database.types';
import { SongChordReviewSchema, type SongChordReview } from '@/schemas/SongChordReviewSchema';

/** One line of the run's results.jsonl. */
export interface ReviewResultLine {
  id: string;
  status: string;
  reference: string | null;
  tool: string;
}

export type SourceName = 'chord-id' | 'chord-compare';

export interface SourceRow {
  song_id: string;
  source: SourceName;
  tool_version: string;
  payload: Json;
}

export interface PlannedSong {
  rows: SourceRow[];
  review: SongChordReview | null;
  problem: string | null;
}

export const CHORD_ID_TOOL = 'Logic Pro Chord ID (song2logic chord-id)';

/** A Chord ID result counts only when it heard something: `chords` as [[start_s, "Am"], …]. */
export function hasChordIdChords(document: unknown): boolean {
  if (typeof document !== 'object' || document === null) return false;
  const chords = (document as { chords?: unknown }).chords;
  return (
    Array.isArray(chords) &&
    chords.length > 0 &&
    chords.every(
      (change) =>
        Array.isArray(change) && typeof change[0] === 'number' && typeof change[1] === 'string'
    )
  );
}

/**
 * The source rows of one song: always its review (validated against the schema shared with the app), plus the
 * Chord ID result it was made from when there is one. A review that fails the schema loads nothing.
 */
export function planSong(
  line: ReviewResultLine,
  review: unknown,
  chordId: unknown | undefined
): PlannedSong {
  const parsed = SongChordReviewSchema.safeParse(review);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path.join('.') ?? '';
    return {
      rows: [],
      review: null,
      problem: `${line.id}: review does not match the schema (${path})`,
    };
  }
  const rows: SourceRow[] = [
    {
      song_id: line.id,
      source: 'chord-compare',
      tool_version: line.tool,
      payload: parsed.data as unknown as Json,
    },
  ];
  if (chordId !== undefined && hasChordIdChords(chordId)) {
    rows.push({
      song_id: line.id,
      source: 'chord-id',
      tool_version: CHORD_ID_TOOL,
      payload: chordId as Json,
    });
  }
  return { rows, review: parsed.data, problem: null };
}

/** Counts per review status and per source, for the --validateOnly report. */
export function countPlan(counts: Record<string, number>, planned: PlannedSong): void {
  const key = planned.review ? `status:${planned.review.status}` : 'invalid';
  counts[key] = (counts[key] ?? 0) + 1;
  for (const row of planned.rows)
    counts[`rows:${row.source}`] = (counts[`rows:${row.source}`] ?? 0) + 1;
}
