import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { SongCard } from '@/lib/music-theory/song-card';
import type { CardReview } from '@/lib/music-theory/song-card-review';
import * as z from 'zod';

import { songCardFromRows } from './song-card-queries';
import { reviewFromRow } from './song-card-review';

const ResultSchema = z.object({
  analysis: z.unknown(),
  segments: z.unknown(),
  review: z.unknown(),
});

/**
 * The card as a student gets it (SNG-17): through `song_card_for_student`, which answers only for a song of the
 * student's own repertoire and leaves out the teacher's material (degrees, bass, drums, capo advice). Null when
 * the student may not open it or there is no analysis.
 */
export async function getSongCardForStudent(
  songId: string
): Promise<{ card: SongCard; review: CardReview } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('song_card_for_student', { p_song_id: songId });
  if (error) {
    logger.warn('[song-card] student card fetch failed', { songId, error });
    return null;
  }
  const parsed = ResultSchema.safeParse(data);
  if (!parsed.success) return null;
  const card = songCardFromRows(parsed.data.analysis ?? null, parsed.data.segments ?? null);
  if (!card) return null;
  return { card, review: reviewFromRow(parsed.data.review ?? null, card.youtubeId) };
}
