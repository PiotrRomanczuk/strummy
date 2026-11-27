import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { buildSongCard, youtubeId, type SongCard } from '@/lib/music-theory/song-card';
import { BassBarsSchema, SongCardAnalysisRowSchema } from '@/schemas/SongCardSchema';
import { SongPartSchema } from '@/schemas/SongSegmentsSchema';
import * as z from 'zod';

// Only the parts of the analysis document the card draws — the whole document is far larger.
const ANALYSIS_COLUMNS =
  'source_url, updated_at, created:analysis->created, duration_s:analysis->duration_s, grid:analysis->grid, key:analysis->key, chords:analysis->chords, rhythm:analysis->rhythm, capo:analysis->harmony->capo';
const SEGMENT_COLUMNS = 'recording_url, parts, bass_bars, feel, felt_bpm';

const SegmentsRowSchema = z.object({
  recording_url: z.string(),
  parts: z.array(SongPartSchema).min(1),
  bass_bars: BassBarsSchema,
  feel: z.string().nullish(),
  felt_bpm: z.number().nullish(),
});

/** The teacher's tempo of the song (`songs.tempo`), or null when it is not set or cannot be read. */
export async function fetchSongBpm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  songId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from('songs')
    .select('tempo')
    .eq('id', songId)
    .maybeSingle();
  if (error) logger.warn('[song-card] song tempo fetch failed', { songId, error });
  return data?.tempo ?? null;
}

/** Same recording: the same YouTube video in any link form, or the same address. */
export function isSameRecording(a: string | null, b: string): boolean {
  const id = youtubeId(a);
  return id ? id === youtubeId(b) : a === b;
}

/**
 * The card from the two rows. Null without a usable analysis; the parts are left out when they are missing, do
 * not fit the schema, or were heard in another recording than the analysis (their seconds would not match).
 */
export function songCardFromRows(
  analysisRow: unknown,
  segmentsRow: unknown,
  songBpm: number | null = null
): SongCard | null {
  if (analysisRow === null) return null;
  const analysis = SongCardAnalysisRowSchema.safeParse(analysisRow);
  if (!analysis.success) return null;
  const { source_url, updated_at, created, duration_s, grid, key, chords, rhythm, capo } =
    analysis.data;
  const segments = segmentsRow === null ? null : SegmentsRowSchema.safeParse(segmentsRow);
  const isSame =
    segments?.success === true && isSameRecording(source_url, segments.data.recording_url);
  const isUsable = isSame && segments.data.bass_bars.length === segments.data.parts.length;
  const isHalfTime = isSame && segments.data.feel === 'half_time';
  return buildSongCard({
    sourceUrl: source_url ?? (segments?.success ? segments.data.recording_url : null),
    analysedOn: created ?? updated_at ?? null,
    duration: duration_s,
    grid,
    key,
    chords,
    rhythm,
    capo: capo ?? null,
    songBpm,
    feltBpm: isHalfTime ? (segments.data.felt_bpm ?? null) : null,
    segments:
      isUsable && segments?.success
        ? { parts: segments.data.parts, bassBars: segments.data.bass_bars }
        : null,
  });
}

/**
 * The song card from song2logic's analysis of the song's recording (`song_analyses` + `song_segments`).
 * Staff only for now — RLS returns nothing to a student. Null when the song has no analysis or the fetch fails:
 * the card page then says so instead of failing.
 */
export async function getSongCard(songId: string): Promise<SongCard | null> {
  try {
    const supabase = await createClient();
    const [analysis, segments, songBpm] = await Promise.all([
      supabase.from('song_analyses').select(ANALYSIS_COLUMNS).eq('song_id', songId).maybeSingle(),
      supabase.from('song_segments').select(SEGMENT_COLUMNS).eq('song_id', songId).maybeSingle(),
      fetchSongBpm(supabase, songId),
    ]);
    if (analysis.error) throw analysis.error;
    if (segments.error)
      logger.warn('[song-card] segments fetch failed', { songId, error: segments.error });
    const card = songCardFromRows(analysis.data, segments.error ? null : segments.data, songBpm);
    if (analysis.data && !card)
      logger.warn('[song-card] stored analysis does not fit the card', { songId });
    return card;
  } catch (error) {
    logger.warn('[song-card] fetch failed', { songId, error });
    return null;
  }
}
