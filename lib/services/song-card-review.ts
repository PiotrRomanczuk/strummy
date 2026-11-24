import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { youtubeId } from '@/lib/music-theory/song-card';
import { EMPTY_REVIEW, type CardReview } from '@/lib/music-theory/song-card-review';
import { SongCardReviewRowSchema } from '@/schemas/SongCardReviewSchema';

const COLUMNS = 'recording_url, approved_groups, strums, chord_edits';

/** The recording a review belongs to, written the one way (the card knows only the video id). */
export const reviewRecordingUrl = (videoId: string | null): string =>
  videoId ? `https://www.youtube.com/watch?v=${videoId}` : 'unknown';

/**
 * A stored review as the card uses it. A review of another recording than the card's is ignored — its bars and
 * groups belong to that recording's analysis.
 */
export function reviewFromRow(row: unknown, videoId: string | null): CardReview {
  if (row === null) return EMPTY_REVIEW;
  const parsed = SongCardReviewRowSchema.safeParse(row);
  if (!parsed.success) return EMPTY_REVIEW;
  const { recording_url, approved_groups, strums, chord_edits } = parsed.data;
  if (videoId && youtubeId(recording_url) !== videoId) return EMPTY_REVIEW;
  const chordEdits = Object.fromEntries(
    Object.entries(chord_edits).map(([bar, chord]) => [Number(bar), chord])
  );
  return { approvedGroups: approved_groups, strums, chordEdits };
}

/** The review of a song's card (staff only — RLS). Empty when there is none or it cannot be read. */
export async function getSongCardReview(
  songId: string,
  videoId: string | null
): Promise<CardReview> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('song_card_reviews')
    .select(COLUMNS)
    .eq('song_id', songId)
    .maybeSingle();
  if (error) logger.warn('[song-card] review fetch failed', { songId, error });
  return reviewFromRow(error ? null : data, videoId);
}

/** The row to store for a review. */
export function rowFromReview(songId: string, videoId: string | null, review: CardReview) {
  return {
    song_id: songId,
    recording_url: reviewRecordingUrl(videoId),
    approved_groups: review.approvedGroups,
    strums: review.strums,
    chord_edits: Object.fromEntries(
      Object.entries(review.chordEdits).map(([bar, chord]) => [String(bar), chord])
    ),
  };
}
