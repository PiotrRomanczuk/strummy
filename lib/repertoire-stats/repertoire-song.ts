/**
 * One song of the admin repertoire statistics (SNG-13): what the teacher entered in Strummy, what song2logic
 * measured from the recording (`song_analyses`), the transcription's per-track stats (`song_transcriptions`) and
 * how many students have the song in their repertoire.
 */

import * as z from 'zod';

import { tonicNumeral } from '@/lib/music-theory/roman-numeral';
import { TrackStatsSchema } from '@/schemas/SongTranscriptionSchema';

export interface TrackSummary {
  notes: number;
  low: number | null;
  high: number | null;
  perBar: number;
  /** Share of the bars in which the track plays, 0–1. */
  activeShare: number;
}

/** A progression song2logic heard repeating: Roman numerals against the measured key, and the chords. */
export interface MeasuredProgression {
  roman: string[];
  chords: string[];
  bars: number;
}

export interface RepertoireSong {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  level: string | null;
  hasLink: boolean;
  /** Students with the song in their repertoire. */
  students: number;
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
    /** How sure the key detection was, 0–1; null when the analysis does not say. */
    keyStrength: number | null;
    durationMs: number | null;
    durationMatches: boolean | null;
    chords: string[];
    /** The capo song2logic suggests for open shapes: a playing hint, not a measurement. */
    suggestedCapo: number | null;
    progressions: MeasuredProgression[];
  } | null;
  transcription: { notes: number; tracks: Record<string, TrackSummary> } | null;
}

export interface SongStatsRow {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  level: string | null;
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
  key_strength: unknown;
  capo_fret: unknown;
  progressions: unknown;
}

export interface TranscriptionStatsRow {
  song_id: string;
  note_count: number;
  stats: unknown;
}

const StatsSchema = z.record(z.string(), TrackStatsSchema);
const ProgressionsSchema = z.array(
  z.object({ roman: z.array(z.string()), chords: z.array(z.string()), bars: z.number() })
);

const numberOrNull = (value: unknown) => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
};

function tracksOf(stats: unknown): Record<string, TrackSummary> {
  const parsed = StatsSchema.safeParse(stats);
  if (!parsed.success) return {};
  return Object.fromEntries(
    Object.entries(parsed.data).map(([track, found]) => [
      track,
      {
        notes: found.notes,
        low: found.low,
        high: found.high,
        perBar: found.per_bar,
        activeShare: found.active_share,
      },
    ])
  );
}

function measuredOf(analysis: AnalysisStatsRow): NonNullable<RepertoireSong['measured']> {
  const progressions = ProgressionsSchema.safeParse(analysis.progressions);
  return {
    bpm: analysis.bpm === null ? null : Number(analysis.bpm),
    beatsPerBar: analysis.beats_per_bar,
    key: analysis.key,
    keyStrength: numberOrNull(analysis.key_strength),
    durationMs: analysis.source_duration_ms,
    durationMatches: analysis.duration_matches,
    chords: analysis.chords ?? [],
    suggestedCapo: numberOrNull(analysis.capo_fret),
    progressions: (progressions.data ?? []).map((progression) => ({
      ...progression,
      roman: progression.roman.map((n) => tonicNumeral(n, analysis.key?.endsWith('m') ?? false)),
    })),
  };
}

/** Joins a song with its analysis, transcription and student count; unparsable stats read as empty. */
export function toRepertoireSong(
  song: SongStatsRow,
  analysis: AnalysisStatsRow | undefined,
  transcription: TranscriptionStatsRow | undefined,
  students = 0
): RepertoireSong {
  return {
    id: song.id,
    title: song.title,
    author: song.author,
    category: song.category,
    level: song.level,
    hasLink: !!song.youtube_url?.trim(),
    students,
    entered: {
      tempo: song.tempo,
      key: song.key,
      capo: song.capo_fret ?? 0,
      durationMs: song.duration_ms,
      chords: song.chords,
    },
    measured: analysis ? measuredOf(analysis) : null,
    transcription: transcription
      ? { notes: transcription.note_count, tracks: tracksOf(transcription.stats) }
      : null,
  };
}
