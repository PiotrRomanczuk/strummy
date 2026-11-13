import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { SongChordReviewSchema, type SongChordReview } from '@/schemas/SongChordReviewSchema';

async function fetchReviewPayload(songId: string): Promise<unknown> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('song_analysis_sources')
    .select('payload')
    .eq('song_id', songId)
    .eq('source', 'chord-compare')
    .maybeSingle();
  if (error) throw error;
  return data?.payload ?? null;
}

/**
 * The song's chord review from song2logic (`song_analysis_sources`, source `chord-compare`). Staff only — RLS
 * returns nothing to a student. Null when the song has no review, the stored one no longer fits the schema, or
 * the fetch fails: the card is an extra and must never take the song page down.
 */
export async function getSongChordReview(songId: string): Promise<SongChordReview | null> {
  let payload: unknown;
  try {
    payload = await fetchReviewPayload(songId);
  } catch (error) {
    logger.warn('[song-chord-review] fetch failed', { songId, error });
    return null;
  }
  if (payload === null) return null;
  const parsed = SongChordReviewSchema.safeParse(payload);
  if (!parsed.success) {
    logger.warn('[song-chord-review] stored review does not match the schema', { songId });
    return null;
  }
  return parsed.data;
}
