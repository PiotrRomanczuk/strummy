'use server';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { SongPartTempoInputSchema } from '@/schemas/SongPartProgressSchema';

type MarkResult = { success: true } | { error: 'invalid' | 'forbidden' | 'failed' };

/**
 * One new mark in a student's history: "plays this part of this song at N% of the original tempo". History is
 * append-only, so a correction is a new mark (or the marker deleting a mis-tap). Staff only; RLS decides
 * whether this teacher may mark this student.
 */
export async function markSongPartTempo(input: unknown): Promise<MarkResult> {
  const parsed = SongPartTempoInputSchema.safeParse(input);
  if (!parsed.success) return { error: 'invalid' };

  const { isAdmin, isTeacher, profileId } = await getUserWithRolesSSR();
  if ((!isAdmin && !isTeacher) || !profileId) return { error: 'forbidden' };

  const { studentId, songId, partLabel, tempoPercent, lessonId } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from('student_song_progress').insert({
    student_id: studentId,
    song_id: songId,
    part_label: partLabel,
    tempo_percent: tempoPercent,
    lesson_id: lessonId ?? null,
    marked_by: profileId,
  });
  if (error) {
    logger.error('[song-progress] mark failed', { studentId, songId, error });
    return { error: 'failed' };
  }
  return { success: true };
}
