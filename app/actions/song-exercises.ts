'use server';

import { revalidatePath } from 'next/cache';
import * as z from 'zod';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/server';
import { reviewRecordingUrl } from '@/lib/services/song-card-review';
import { CreateSongExerciseSchema } from '@/schemas/SongExerciseSchema';

type CreateResult =
  { exerciseId: string } | { error: 'forbidden' | 'invalid' | 'duplicate' | 'failed' };
type DeleteResult = { deleted: true } | { error: 'forbidden' | 'invalid' | 'failed' };

const UNIQUE_VIOLATION = '23505';

/** Saves one part of a song, at a tempo, as a named exercise. Staff only; RLS enforces it again. */
export async function createSongExercise(input: unknown): Promise<CreateResult> {
  const parsed = CreateSongExerciseSchema.safeParse(input);
  if (!parsed.success) return { error: 'invalid' };
  const { isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!isAdmin && !isTeacher) return { error: 'forbidden' };

  const exercise = parsed.data;
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from('song_exercises')
    .insert({
      song_id: exercise.songId,
      recording_url: reviewRecordingUrl(exercise.videoId),
      part_n: exercise.partN,
      name: exercise.name,
      kind: exercise.kind,
      tempo_percent: exercise.tempoPercent,
      source: exercise.source,
      note: exercise.note,
    })
    .select('id')
    .single();
  if (error || !row) {
    if (error?.code === UNIQUE_VIOLATION) return { error: 'duplicate' };
    logger.error('[song-exercises] create failed', { songId: exercise.songId, error });
    return { error: 'failed' };
  }
  revalidatePath('/dashboard/exercises');
  return { exerciseId: row.id };
}

/** Removes an exercise from the library. Staff only; RLS enforces it again. */
export async function deleteSongExercise(exerciseId: string): Promise<DeleteResult> {
  if (!z.string().uuid().safeParse(exerciseId).success) return { error: 'invalid' };
  const { isAdmin, isTeacher } = await getUserWithRolesSSR();
  if (!isAdmin && !isTeacher) return { error: 'forbidden' };

  const supabase = await createClient();
  const { error } = await supabase.from('song_exercises').delete().eq('id', exerciseId);
  if (error) {
    logger.error('[song-exercises] delete failed', { exerciseId, error });
    return { error: 'failed' };
  }
  revalidatePath('/dashboard/exercises');
  return { deleted: true };
}
