import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { toRollTrack, type RollTrack } from '@/lib/music-theory/transcription-roll';
import { SongTranscriptionReadSchema } from '@/schemas/SongTranscriptionSchema';

export interface SongTranscriptionView {
  recordingUrl: string;
  transcribedOn: string | null;
  /** Bars of the recording (one per downbeat). */
  bars: number;
  bass: RollTrack;
  vocals: RollTrack;
}

async function fetchTranscription(songId: string): Promise<unknown> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('song_transcriptions')
    .select('recording_url, transcribed_on, grid, bass:tracks->Bas, vocals:tracks->Wokal')
    .eq('song_id', songId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * The song's bass line and vocal melody from song2logic's transcription (`song_transcriptions`, SNG-12), placed
 * on the recording's real bars. Staff only — RLS returns nothing to a student. Null when the song has no
 * transcription, the stored one no longer fits the schema, or the fetch fails: the card is an extra and must
 * never take the song page down.
 */
export async function getSongTranscription(songId: string): Promise<SongTranscriptionView | null> {
  let row: unknown;
  try {
    row = await fetchTranscription(songId);
  } catch (error) {
    logger.warn('[song-transcription] fetch failed', { songId, error });
    return null;
  }
  if (row === null) return null;
  const parsed = SongTranscriptionReadSchema.safeParse(row);
  if (!parsed.success) {
    logger.warn('[song-transcription] stored transcription does not match the schema', { songId });
    return null;
  }
  const { recording_url, transcribed_on, grid, bass, vocals } = parsed.data;
  return {
    recordingUrl: recording_url,
    transcribedOn: transcribed_on,
    bars: grid.downbeats_s.length,
    bass: toRollTrack(bass, grid),
    vocals: toRollTrack(vocals, grid),
  };
}
