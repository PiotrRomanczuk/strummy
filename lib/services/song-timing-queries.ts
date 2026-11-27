import { cache } from 'react';
import * as z from 'zod';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  resolveSongTiming,
  type RecordingFacts,
  type SongTiming,
} from '@/lib/music-theory/song-tempo';

import { isSameRecording } from './song-card-queries';

/** The same fields the song card reads, so the page and the card show the same values. */
const ANALYSIS_COLUMNS =
  'source_url, updated_at, created:analysis->created, duration_s:analysis->duration_s, bpm:analysis->grid->bpm';

const SongRowSchema = z.object({
  tempo: z.number().nullable(),
  duration_ms: z.number().nullable(),
});
const AnalysisRowSchema = z.object({
  source_url: z.string().nullable(),
  updated_at: z.string().nullable().optional(),
  created: z.string().nullable().optional(),
  duration_s: z.number().nullable().optional(),
  bpm: z.number().nullable().optional(),
});
const SegmentsRowSchema = z.object({
  recording_url: z.string(),
  feel: z.string(),
  felt_bpm: z.number(),
});

/** What song2logic measured in the recording, or null without a usable analysis. */
export function recordingFromRows(
  analysisRow: unknown,
  segmentsRow: unknown
): RecordingFacts | null {
  const analysis = AnalysisRowSchema.safeParse(analysisRow);
  if (!analysis.success) return null;
  const segments = SegmentsRowSchema.safeParse(segmentsRow);
  const isHalfTime =
    segments.success &&
    segments.data.feel === 'half_time' &&
    isSameRecording(analysis.data.source_url, segments.data.recording_url);
  return {
    bpm: analysis.data.bpm ?? null,
    feltBpm: isHalfTime ? segments.data.felt_bpm : null,
    durationSeconds: analysis.data.duration_s ?? null,
    analysedOn: analysis.data.created ?? analysis.data.updated_at ?? null,
  };
}

/**
 * Tempo, length and analysis date of a song as both the song page and the song card show them (#1241). The
 * analysis is staff-only under RLS, so a student gets the song's own values. Cached per request: the page's hero
 * and its song map share one read. Never throws — a failed read falls back to the song's own values.
 */
export const getSongTiming = cache(async (songId: string): Promise<SongTiming | null> => {
  try {
    const supabase = await createClient();
    const [song, analysis, segments] = await Promise.all([
      supabase.from('songs').select('tempo, duration_ms').eq('id', songId).maybeSingle(),
      supabase.from('song_analyses').select(ANALYSIS_COLUMNS).eq('song_id', songId).maybeSingle(),
      supabase
        .from('song_segments')
        .select('recording_url, feel, felt_bpm')
        .eq('song_id', songId)
        .maybeSingle(),
    ]);
    const own = SongRowSchema.safeParse(song.data);
    if (!own.success) return null;
    const recording = analysis.error ? null : recordingFromRows(analysis.data, segments.data);
    return resolveSongTiming(
      { tempo: own.data.tempo, durationMs: own.data.duration_ms },
      recording
    );
  } catch (error) {
    logger.warn('[song-timing] fetch failed', { songId, error });
    return null;
  }
});
