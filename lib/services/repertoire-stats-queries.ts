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
import { sectionsOf, type SongDetail } from '@/lib/repertoire-stats/song-progressions';

const PAGE_SIZE = 1000;
const MAX_PAGES = 20;
const SONG_COLUMNS =
  'id, title, author, category, level, tempo, key, capo_fret, duration_ms, chords, youtube_url';
const ANALYSIS_COLUMNS =
  'song_id, bpm, beats_per_bar, key, source_duration_ms, duration_matches, chords, key_strength:analysis->key->strength, capo_fret:analysis->harmony->capo->fret, progressions:analysis->harmony->progressions';

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

/** Students per song: distinct students with the song in their repertoire. */
function studentsPerSong(rows: { song_id: string; student_id: string }[]): Map<string, number> {
  const students = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = students.get(row.song_id) ?? new Set<string>();
    set.add(row.student_id);
    students.set(row.song_id, set);
  }
  return new Map([...students].map(([song, set]) => [song, set.size]));
}

/**
 * Every live song with its analysis, its transcription stats (never the raw notes) and its student count, for the
 * admin repertoire statistics (SNG-13). Cached per request: the views of the page share one fetch.
 */
export const getRepertoireSongs = cache(async (): Promise<RepertoireSong[]> => {
  const supabase = await createClient();
  const [songs, analyses, transcriptions, repertoire] = await Promise.all([
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
    fetchAll<{ song_id: string; student_id: string }>('student_repertoire', (from, to) =>
      supabase.from('student_repertoire').select('song_id, student_id').order('id').range(from, to)
    ),
  ]);
  const analysisOf = new Map(analyses.map((row) => [row.song_id, row]));
  const transcriptionOf = new Map(transcriptions.map((row) => [row.song_id, row]));
  const studentsOf = studentsPerSong(repertoire);
  return songs
    .map((song) =>
      toRepertoireSong(
        song,
        analysisOf.get(song.id),
        transcriptionOf.get(song.id),
        studentsOf.get(song.id) ?? 0
      )
    )
    .sort((a, b) => a.title.localeCompare(b.title));
});

/** One song's chord sheet and the recording's sections with their chords, for the progressions view. */
export async function getRepertoireSongDetail(songId: string): Promise<SongDetail | null> {
  const supabase = await createClient();
  const [song, analysis] = await Promise.all([
    supabase.from('songs').select('lyrics_with_chords').eq('id', songId).maybeSingle(),
    supabase
      .from('song_analyses')
      .select(
        'sections:analysis->sections, bar_chords:analysis->chords, vocabulary:analysis->harmony->vocabulary'
      )
      .eq('song_id', songId)
      .maybeSingle(),
  ]);
  if (song.error || analysis.error) {
    logger.error('[repertoire-stats] song detail fetch failed', song.error ?? analysis.error);
    return null;
  }
  return {
    sheet: song.data?.lyrics_with_chords ?? null,
    sections: analysis.data
      ? sectionsOf(analysis.data.sections, analysis.data.bar_chords, analysis.data.vocabulary)
      : [],
  };
}
