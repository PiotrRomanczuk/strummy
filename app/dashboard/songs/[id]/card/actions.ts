'use server';

import { createClient } from '@/lib/supabase/server';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { logger } from '@/lib/logger';
import { applyReviewPatch, type CardReview } from '@/lib/music-theory/song-card-review';
import { getSongCardReview, rowFromReview } from '@/lib/services/song-card-review';
import { ReviewPatchSchema } from '@/schemas/SongCardReviewSchema';
import * as z from 'zod';

type Result = { review: CardReview } | { error: 'forbidden' | 'invalid' | 'failed' };

const SONG_ID = z.string().uuid();
const VIDEO_ID = z
  .string()
  .regex(/^[\w-]{11}$/)
  .nullable();

/**
 * One change to the teacher's review of a song card (approve a group's chords, correct a group's strum or a
 * bar's chord), applied to the stored review and saved whole. Staff only; RLS enforces it again.
 */
export async function saveSongCardReview(
  songId: string,
  videoId: string | null,
  patch: unknown
): Promise<Result> {
  const input = z.tuple([SONG_ID, VIDEO_ID, ReviewPatchSchema]).safeParse([songId, videoId, patch]);
  if (!input.success) return { error: 'invalid' };
  const { isAdmin, isTeacher, profileId } = await getUserWithRolesSSR();
  if (!isAdmin && !isTeacher) return { error: 'forbidden' };

  const [id, video, change] = input.data;
  const review = applyReviewPatch(await getSongCardReview(id, video), change);
  const supabase = await createClient();
  const { error } = await supabase
    .from('song_card_reviews')
    .upsert({ ...rowFromReview(id, video, review), updated_by: profileId ?? null });
  if (error) {
    logger.error('[song-card] review save failed', { songId: id, error });
    return { error: 'failed' };
  }
  return { review };
}
