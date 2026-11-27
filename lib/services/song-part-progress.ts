import * as z from 'zod';

import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';

import {
  deriveSongProgress,
  type SongProgress,
  type SongProgressMark,
} from './song-part-progress.helpers';

const PartsSchema = z.array(z.object({ label: z.string() }));

/** Distinct part labels of a stored `song_segments.parts` value; empty when it is not a list of parts. */
export function partLabelsFromParts(parts: unknown): string[] {
  const parsed = PartsSchema.safeParse(parts);
  return parsed.success ? [...new Set(parsed.data.map((part) => part.label))] : [];
}

async function fetchMarks(studentId: string, songId: string) {
  const supabase = await createClient();
  return supabase
    .from('student_song_progress')
    .select('part_label, tempo_percent, marked_at')
    .eq('student_id', studentId)
    .eq('song_id', songId)
    .order('marked_at', { ascending: false });
}

function toMarks(
  rows: { part_label: string | null; tempo_percent: number; marked_at: string }[] | null
): SongProgressMark[] {
  return (rows ?? []).map((row) => ({
    partLabel: row.part_label,
    tempoPercent: row.tempo_percent,
    markedAt: row.marked_at,
  }));
}

/**
 * Every stored mark of the student for this song, newest first, for a view that re-derives the status as the
 * teacher adds marks (the song card). Same RLS as below; a failed read counts as "no marks".
 */
export async function getSongProgressMarks(
  studentId: string,
  songId: string
): Promise<SongProgressMark[]> {
  const marks = await fetchMarks(studentId, songId);
  if (marks.error) {
    logger.warn('[song-progress] marks fetch failed', { studentId, songId });
    return [];
  }
  return toMarks(marks.data);
}

/**
 * What the student can play of the song: status plus the latest tempo per part. Reads under the caller's RLS
 * (teachers of the student, the student, the parent, admins); a failed read counts as "no progress".
 */
export async function getSongPartProgress(
  studentId: string,
  songId: string
): Promise<SongProgress> {
  const supabase = await createClient();
  const [segments, marks] = await Promise.all([
    supabase.from('song_segments').select('parts').eq('song_id', songId).maybeSingle(),
    fetchMarks(studentId, songId),
  ]);
  if (segments.error) logger.warn('[song-progress] segments fetch failed', { songId });
  if (marks.error) {
    logger.warn('[song-progress] marks fetch failed', { studentId, songId });
    return deriveSongProgress([], []);
  }
  return deriveSongProgress(partLabelsFromParts(segments.data?.parts), toMarks(marks.data));
}
