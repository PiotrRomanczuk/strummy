import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  toRepertoireSong,
  type AnalysisStatsRow,
  type RepertoireSong,
  type SongStatsRow,
  type TranscriptionStatsRow,
} from '@/lib/repertoire-stats/repertoire-song';

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;
const SONG_COLUMNS =
  'id, title, author, category, tempo, key, capo_fret, duration_ms, chords, youtube_url';
const ANALYSIS_COLUMNS =
  'song_id, bpm, beats_per_bar, key, source_duration_ms, duration_matches, chords';

type Page<T> = (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>;

/** Every row of a query, a page at a time (PostgREST caps a response at 1000 rows). */
async function fetchAll<T>(label: string, page: Page<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let index = 0; index < MAX_PAGES; index++) {
    const from = index * PAGE_SIZE;
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) {
      logger.error(`[repertoire-stats] ${label} fetch failed`, error);
      break;
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return rows;
}

/**
 * Every live song with its analysis and its transcription stats (never the raw notes), for the admin repertoire
 * statistics (SNG-13). Cached per request: the four views of the page share one fetch.
 */
export const getRepertoireSongs = cache(async (): Promise<RepertoireSong[]> => {
  const supabase = await createClient();
  const [songs, analyses, transcriptions] = await Promise.all([
    fetchAll<SongStatsRow>('songs', (from, to) =>
      supabase.from('songs').select(SONG_COLUMNS).is('deleted_at', null).order('id').range(from, to)
    ),
    fetchAll<AnalysisStatsRow>('song_analyses', (from, to) =>
      supabase.from('song_analyses').select(ANALYSIS_COLUMNS).order('song_id').range(from, to)
    ),
    fetchAll<TranscriptionStatsRow>('song_transcriptions', (from, to) =>
      supabase
        .from('song_transcriptions')
        .select('song_id, note_count, stats')
        .order('song_id')
        .range(from, to)
    ),
  ]);
  const analysisOf = new Map(analyses.map((row) => [row.song_id, row]));
  const transcriptionOf = new Map(transcriptions.map((row) => [row.song_id, row]));
  return songs
    .map((song) => toRepertoireSong(song, analysisOf.get(song.id), transcriptionOf.get(song.id)))
    .sort((a, b) => a.title.localeCompare(b.title));
});
