/**
 * Which EMPTY `songs` fields a chord review may fill (SNG-8). Pure — the loader is
 * 2026-11-song-analysis-sources.ts. Nothing written by a person is ever replaced: only null / blank columns,
 * and each filled column is listed in `song_analyses.filled_fields` so it can be told apart and undone.
 */

import type { SongChordReview } from '@/schemas/SongChordReviewSchema';

import { musicKey } from './song-analyses-keys';

export interface ChordFillSong {
  id: string;
  chords: string | null;
  capo_fret: number | null;
  key: string | null;
}

export type ChordFill = Partial<Pick<ChordFillSong, 'chords' | 'capo_fret' | 'key'>>;

// Fewer distinct chords than this from Chord ID is a failed detection, not a song.
const MIN_MAIN_CHORDS = 2;

/**
 * - `chords`: Chord ID's main chords, in the order first heard — only from Chord ID, never from `analyze`
 *   (the earlier song-analyses backfill already filled chords from it).
 * - `capo_fret`: the capo the written chords need to sound like the recording — only when Chord ID heard the song
 *   and agrees with the sheet (from `analyze` alone the transposition was wrong in 4 of 6 dev songs, 2026-11-13).
 * - `key`: the sounding key, only when two independent sources agree and the chords are not written for a capo
 *   (then the written key and the sounding key differ, and which one Strummy means is the teacher's call).
 */
export function planChordFill(song: ChordFillSong, review: SongChordReview): ChordFill {
  const fill: ChordFill = {};
  const isChordId = review.reference === 'chord-id';
  if (!song.chords?.trim() && isChordId && review.main_chords.length >= MIN_MAIN_CHORDS) {
    fill.chords = review.main_chords.join(', ');
  }
  const isCapoTrusted = isChordId && review.status === 'agree';
  if (song.capo_fret === null && review.capo_hint && isCapoTrusted)
    fill.capo_fret = review.capo_hint;
  const isWrittenForCapo = (review.transpose ?? 0) !== 0 || !!fill.capo_fret;
  if (song.key === null && review.key_sources_agree && review.sounding_key && !isWrittenForCapo) {
    fill.key = musicKey(review.sounding_key);
  }
  return fill;
}
