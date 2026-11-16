/**
 * One song of the admin repertoire statistics (SNG-13): what the teacher entered in Strummy, what song2logic
 * measured from the recording (`song_analyses`) and the transcription's per-track stats (`song_transcriptions`).
 */

import * as z from 'zod';

import { TrackStatsSchema } from '@/schemas/SongTranscriptionSchema';

export interface TrackSummary {
  notes: number;
  low: number | null;
  high: number | null;
  perBar: number;
}

export interface RepertoireSong {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  hasLink: boolean;
  entered: {
    tempo: number | null;
    key: string | null;
    capo: number;
    durationMs: number | null;
    chords: string | null;
  };
  measured: {
    bpm: number | null;
    beatsPerBar: number | null;
    key: string | null;
    durationMs: number | null;
    durationMatches: boolean | null;
    chords: string[];
  } | null;
  transcription: { notes: number; bass: TrackSummary | null; vocals: TrackSummary | null } | null;
}

export interface SongStatsRow {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  tempo: number | null;
  key: string | null;
  capo_fret: number | null;
  duration_ms: number | null;
  chords: string | null;
  youtube_url: string | null;
}

export interface AnalysisStatsRow {
  song_id: string;
  bpm: number | null;
  beats_per_bar: number | null;
  key: string | null;
  source_duration_ms: number | null;
  duration_matches: boolean | null;
  chords: string[] | null;
}

export interface TranscriptionStatsRow {
  song_id: string;
  note_count: number;
  stats: unknown;
}

const StatsSchema = z.record(z.string(), TrackStatsSchema);

const summary = (stats: z.infer<typeof StatsSchema>, track: string): TrackSummary | null => {
  const found = stats[track];
  return found
    ? { notes: found.notes, low: found.low, high: found.high, perBar: found.per_bar }
    : null;
};

/** Joins a song with its analysis and transcription; a transcription whose stats no longer parse keeps its count. */
export function toRepertoireSong(
  song: SongStatsRow,
  analysis: AnalysisStatsRow | undefined,
  transcription: TranscriptionStatsRow | undefined
): RepertoireSong {
  const stats = transcription ? StatsSchema.safeParse(transcription.stats) : null;
  return {
    id: song.id,
    title: song.title,
    author: song.author,
    category: song.category,
    hasLink: !!song.youtube_url?.trim(),
    entered: {
      tempo: song.tempo,
      key: song.key,
      capo: song.capo_fret ?? 0,
      durationMs: song.duration_ms,
      chords: song.chords,
    },
    measured: analysis
      ? {
          bpm: analysis.bpm === null ? null : Number(analysis.bpm),
          beatsPerBar: analysis.beats_per_bar,
          key: analysis.key,
          durationMs: analysis.source_duration_ms,
          durationMatches: analysis.duration_matches,
          chords: analysis.chords ?? [],
        }
      : null,
    transcription: transcription
      ? {
          notes: transcription.note_count,
          bass: stats?.success ? summary(stats.data, 'Bas') : null,
          vocals: stats?.success ? summary(stats.data, 'Wokal') : null,
        }
      : null,
  };
}
