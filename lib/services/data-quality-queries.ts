import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { scoreCollection } from '@/lib/data-quality/score';
import { hasRealKey } from '@/lib/data-quality/song-checks';
import {
  SONG_QUALITY_COLUMNS,
  songQualityProfile,
  type SongQualityRecord,
} from '@/lib/data-quality/song-profile';
import type { CollectionQuality, RecordQuality } from '@/lib/data-quality/quality.types';
import { fillSuggestionsOf, type FillSuggestion } from '@/lib/repertoire-stats/fill';
import { fieldMarksOf } from '@/lib/repertoire-stats/mismatch-list';
import { toRepertoireSong, type AnalysisStatsRow } from '@/lib/repertoire-stats/repertoire-song';
import { getAnalysisRows } from '@/lib/services/repertoire-stats-queries';

/** PostgREST caps a response at 1000 rows; page through to see the whole catalog. */
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;

export type SongQualityReport = {
  quality: CollectionQuality;
  songsById: Map<string, SongQualityRecord>;
  /** What each song's recording can fill in where Strummy is empty (SNG-14). */
  suggestions: Map<string, FillSuggestion[]>;
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

const TEMPO_RANGE = [20, 300] as const;

/**
 * The song as the repertoire statistics see it, joined with its analysis. A placeholder key ("C" without chords)
 * or an impossible tempo counts as missing, not as disagreeing with the recording: the completeness rules own it.
 */
function withRecording(song: SongQualityRecord, analysis: AnalysisStatsRow | undefined) {
  const joined = toRepertoireSong({ ...song, title: song.title ?? '' }, analysis, undefined);
  const marks = analysis ? fieldMarksOf(joined) : null;
  const hasTempo =
    song.tempo !== null && song.tempo >= TEMPO_RANGE[0] && song.tempo <= TEMPO_RANGE[1];
  const recording = marks && {
    ...marks,
    key: hasRealKey(song) ? marks.key : null,
    tempo: hasTempo ? marks.tempo : null,
  };
  return { record: { ...song, recording }, joined };
}

/**
 * Scores every live song, its agreement with the recording included. Cached per request so the admin page and a
 * song's badge share one fetch. Duplicate detection needs the whole catalog, which is why a single song's badge
 * goes through the full report too.
 */
export const getSongQualityReport = cache(async (): Promise<SongQualityReport> => {
  const [songs, analyses] = await Promise.all([fetchAllSongs(), getAnalysisRows()]);
  const analysisOf = new Map(analyses.map((row) => [row.song_id, row]));
  const joined = songs.map((song) => withRecording(song, analysisOf.get(song.id)));
  const records = joined.map(({ record }) => record);
  return {
    quality: scoreCollection(songQualityProfile, records),
    songsById: new Map(records.map((record) => [record.id, record])),
    suggestions: new Map(
      joined.map(({ record, joined: song }) => [
        record.id,
        fillSuggestionsOf(record, song.measured),
      ])
    ),
  };
});

export async function getSongQuality(songId: string): Promise<RecordQuality | null> {
  const { quality } = await getSongQualityReport();
  return quality.records.find((record) => record.id === songId) ?? null;
}
