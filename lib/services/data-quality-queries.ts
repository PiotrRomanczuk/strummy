import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { scoreCollection } from '@/lib/data-quality/score';
import {
  SONG_QUALITY_COLUMNS,
  songQualityProfile,
  type SongQualityRecord,
} from '@/lib/data-quality/song-profile';
import type { CollectionQuality, RecordQuality } from '@/lib/data-quality/quality.types';

/** PostgREST caps a response at 1000 rows; page through to see the whole catalog. */
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

export type SongQualityReport = {
  quality: CollectionQuality;
  songsById: Map<string, SongQualityRecord>;
};

async function fetchAllSongs(): Promise<SongQualityRecord[]> {
  const supabase = await createClient();
  const songs: SongQualityRecord[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from('songs')
      .select(SONG_QUALITY_COLUMNS)
      .is('deleted_at', null)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      logger.error('[data-quality] songs fetch failed', error);
      break;
    }
    songs.push(...(data as SongQualityRecord[]));
    if (data.length < PAGE_SIZE) break;
  }
  return songs;
}

/**
 * Scores every live song. Cached per request so the admin page and a song's
 * badge share one fetch. Duplicate detection needs the whole catalog, which is
 * why a single song's badge goes through the full report too.
 */
export const getSongQualityReport = cache(async (): Promise<SongQualityReport> => {
  const songs = await fetchAllSongs();
  return {
    quality: scoreCollection(songQualityProfile, songs),
    songsById: new Map(songs.map((song) => [song.id, song])),
  };
});

export async function getSongQuality(songId: string): Promise<RecordQuality | null> {
  const { quality } = await getSongQualityReport();
  return quality.records.find((record) => record.id === songId) ?? null;
}
