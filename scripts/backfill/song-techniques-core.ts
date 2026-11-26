/**
 * Pure rules of the song-techniques backfill (#1206): one JSONL line (a song's technique counts and note count)
 * → one row of `song_techniques`. No I/O here — see 2026-11-song-techniques.ts.
 */

import { z } from 'zod';

import { STORED_TECHNIQUE_KEYS } from '@/lib/music-theory/song-techniques';

export const TechniqueLineSchema = z.object({
  song_id: z.uuid(),
  notes: z.number().int().positive(),
  techniques: z.partialRecord(z.enum(STORED_TECHNIQUE_KEYS), z.number().int().positive()),
});

export interface TechniquesRow {
  song_id: string;
  note_count: number;
  techniques: Record<string, number>;
  source: 'tab';
}

export interface TechniquesSongRow {
  id: string;
  deleted_at: string | null;
}

export type TechniquesSkip = 'invalid' | 'unknown_song' | 'deleted';

export type PlannedTechniques =
  { row: TechniquesRow; skip: null } | { row: null; skip: TechniquesSkip; problem: string };

/** One JSONL line as text → the validated line, or the reason it is not one. */
export function parseTechniqueLine(
  text: string,
  lineNumber: number
): { line: z.infer<typeof TechniqueLineSchema>; problem: null } | { line: null; problem: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { line: null, problem: `line ${lineNumber}: not JSON` };
  }
  const parsed = TechniqueLineSchema.safeParse(json);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path.join('.') ?? '';
    return { line: null, problem: `line ${lineNumber}: does not match the schema (${path})` };
  }
  return { line: parsed.data, problem: null };
}

/** The table row of one validated line, or why it is not loaded (`song` is null when the id is unknown). */
export function planTechniques(
  line: z.infer<typeof TechniqueLineSchema>,
  song: TechniquesSongRow | null
): PlannedTechniques {
  if (!song) return { row: null, skip: 'unknown_song', problem: `${line.song_id}: no such song` };
  if (song.deleted_at)
    return { row: null, skip: 'deleted', problem: `${line.song_id}: song is deleted` };
  const techniques: Record<string, number> = {};
  for (const [key, count] of Object.entries(line.techniques)) {
    if (count !== undefined) techniques[key] = count;
  }
  return {
    row: { song_id: line.song_id, note_count: line.notes, techniques, source: 'tab' },
    skip: null,
  };
}
