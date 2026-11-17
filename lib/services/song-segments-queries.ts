import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { SongSegmentsReadSchema, type SongPart } from '@/schemas/SongSegmentsSchema';

export interface SongMapView {
  recordingUrl: string;
  analysedOn: string | null;
  /** As song2logic spells it: "F# minor". */
  songKey: string;
  bpm: number;
  /** Set when the song is felt at half its counted tempo (snare on beat 3). */
  feltBpm: number | null;
  beatsPerBar: number;
  parts: SongPart[];
}

async function fetchSegments(songId: string): Promise<unknown> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('song_segments')
    .select('recording_url, analysed_on, song_key, bpm, feel, felt_bpm, beats_per_bar, parts')
    .eq('song_id', songId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * The song part by part from song2logic's analysis of its recording (`song_segments`, SNG-16). Staff only — RLS
 * returns nothing to a student. Null when the song has no segments, the stored ones no longer fit the schema, or
 * the fetch fails: the card is an extra and must never take the song page down.
 */
export async function getSongMap(songId: string): Promise<SongMapView | null> {
  let row: unknown;
  try {
    row = await fetchSegments(songId);
  } catch (error) {
    logger.warn('[song-segments] fetch failed', { songId, error });
    return null;
  }
  if (row === null) return null;
  const parsed = SongSegmentsReadSchema.safeParse(row);
  if (!parsed.success) {
    logger.warn('[song-segments] stored segments do not match the schema', { songId });
    return null;
  }
  const { recording_url, analysed_on, song_key, bpm, feel, felt_bpm, beats_per_bar, parts } =
    parsed.data;
  return {
    recordingUrl: recording_url,
    analysedOn: analysed_on,
    songKey: song_key,
    bpm,
    feltBpm: feel === 'half_time' ? felt_bpm : null,
    beatsPerBar: beats_per_bar,
    parts,
  };
}
