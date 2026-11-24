import * as z from 'zod';

import { BassNoteSchema } from './SongSegmentsSchema';

/**
 * The parts of a song2logic analysis (`song_analyses.analysis`) the song card reads (SNG-17). Older analyses lack
 * `downbeats_s`, the chord halves, `rhythm` or the capo advice; each is optional and the card shows what is there.
 */
export const CardGridSchema = z.object({
  bpm: z.number(),
  beats_per_bar: z.number().int().positive(),
  beats_s: z.array(z.number()).default([]),
  downbeats_s: z.array(z.number()).optional(),
});

export const CardChordSchema = z.object({
  bar: z.number().int(),
  chord: z.string(),
  halves: z.array(z.string()).optional(),
});

export const CardRhythmSchema = z.object({ track: z.string(), pattern: z.string() });

export const CardCapoSchema = z.object({
  fret: z.number().int(),
  shapes: z.record(z.string(), z.string()),
});

/** One `song_analyses` row as the card query selects it (JSON paths of `analysis` under their own names). */
export const SongCardAnalysisRowSchema = z.object({
  source_url: z.string().nullable(),
  updated_at: z.string().nullable().optional(),
  /** The day song2logic analysed the recording (`analysis.created`). */
  created: z.string().nullable().optional(),
  duration_s: z.number().nullable(),
  grid: CardGridSchema,
  key: z.object({ tonic: z.string(), scale: z.string() }).nullable(),
  chords: z
    .array(CardChordSchema)
    .nullable()
    .transform((value) => value ?? []),
  rhythm: z
    .array(CardRhythmSchema)
    .nullable()
    .transform((value) => value ?? []),
  capo: CardCapoSchema.nullable().optional(),
});

/** The bass of every bar of every part, as `song_segments.bass_bars` keeps it. */
export const BassBarsSchema = z.array(z.array(z.array(BassNoteSchema)).nullable());

export type CardGrid = z.infer<typeof CardGridSchema>;
export type CardChord = z.infer<typeof CardChordSchema>;
export type CardCapo = z.infer<typeof CardCapoSchema>;
export type SongCardAnalysisRow = z.infer<typeof SongCardAnalysisRowSchema>;
