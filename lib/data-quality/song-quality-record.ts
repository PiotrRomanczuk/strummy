/** What the song quality profile reads per song: `songs` columns plus the chord review's status. */
import type { Tables } from '@/types/database.types';
import { CHORD_REVIEW_STATUSES, type ChordReviewStatus } from '@/schemas/SongChordReviewSchema';

export const SONG_QUALITY_COLUMNS =
  'id, title, author, level, key, chords, lyrics_with_chords, spotify_link_url, youtube_url, ultimate_guitar_link, tempo, strumming_pattern, category, is_draft, created_at';

export type SongQualityRecord = Pick<
  Tables<'songs'>,
  | 'id'
  | 'title'
  | 'author'
  | 'level'
  | 'key'
  | 'chords'
  | 'lyrics_with_chords'
  | 'spotify_link_url'
  | 'youtube_url'
  | 'ultimate_guitar_link'
  | 'tempo'
  | 'strumming_pattern'
  | 'category'
  | 'is_draft'
  | 'created_at'
> & { chord_review_status?: ChordReviewStatus | null };

/** The song's chord review (song_analysis_sources, source chord-compare), status only. */
export const SONG_CHORD_REVIEW_EMBED = 'song_analysis_sources(status:payload->>status)';

export type SongRowWithReview = Omit<SongQualityRecord, 'chord_review_status'> & {
  song_analysis_sources: { status: string | null }[] | null;
};

const asReviewStatus = (value: string | null | undefined): ChordReviewStatus | null =>
  CHORD_REVIEW_STATUSES.find((status) => status === value) ?? null;

/** The embedded chord review (at most one `chord-compare` row) flattened to its status. */
export function withChordReviewStatus({
  song_analysis_sources: reviews,
  ...song
}: SongRowWithReview): SongQualityRecord {
  return { ...song, chord_review_status: asReviewStatus(reviews?.[0]?.status) };
}
