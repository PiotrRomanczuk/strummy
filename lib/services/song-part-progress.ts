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
    supabase
      .from('student_song_progress')
      .select('part_label, tempo_percent, marked_at')
      .eq('student_id', studentId)
      .eq('song_id', songId)
      .order('marked_at', { ascending: false }),
  ]);
  if (segments.error) logger.warn('[song-progress] segments fetch failed', { songId });
  if (marks.error) {
    logger.warn('[song-progress] marks fetch failed', { studentId, songId });
    return deriveSongProgress([], []);
  }
  const rows: SongProgressMark[] = (marks.data ?? []).map((row) => ({
    partLabel: row.part_label,
    tempoPercent: row.tempo_percent,
    markedAt: row.marked_at,
  }));
  return deriveSongProgress(partLabelsFromParts(segments.data?.parts), rows);
}
