import * as z from 'zod';

/**
 * A song part by part from song2logic `segments` (table `song_segments`, SNG-16). Bars are 1-based; a drum or
 * bass pattern has one character per sixteenth of a bar ("X" in at least half of the part's bars, "x" in a
 * quarter, "." not played).
 */
export const BassNoteSchema = z.object({
  slot: z.number().int(),
  sixteenths: z.number().int(),
  note: z.string(),
  degree: z.string(),
});

const BassSummaryShape = {
  pattern: z.string(),
  notes_per_bar: z.number(),
  lowest: z.string().nullable(),
  highest: z.string().nullable(),
  riff: z.array(BassNoteSchema),
  riff_share: z.number(),
};

export const GrooveSchema = z.object({
  patterns: z.record(z.string(), z.string()),
  kick: z.string().nullable(),
  snare: z.string().nullable(),
  cymbal: z.string().nullable(),
  fills: z.array(z.number().int()),
});

const PartShape = {
  n: z.number().int(),
  label: z.string(),
  name: z.string().nullable(),
  repeat_of: z.number().int().nullable(),
  first_bar: z.number().int(),
  bars: z.number().int(),
  start_s: z.number(),
  end_s: z.number(),
  bpm: z.number(),
  vocals: z.boolean().nullable(),
  chords: z.array(z.string()),
  roman: z.array(z.string()),
  loop: z.array(z.string()),
  drums: GrooveSchema.nullable(),
  levels: z.record(z.string(), z.number()),
};

/** A part as the table keeps it in `parts`: the bass without its bar-by-bar notes. */
export const SongPartSchema = z.object({
  ...PartShape,
  bass: z.object(BassSummaryShape).nullable(),
});

/** A part of a song2logic file: the bass also carries every bar, which the loader moves to `bass_bars`. */
const FilePartSchema = z.object({
  ...PartShape,
  bass: z.object({ ...BassSummaryShape, bars: z.array(z.array(BassNoteSchema)) }).nullable(),
});

/** One `segments/<song id>.json` of a song2logic `strummy-segments` run. */
export const SegmentsFileSchema = z.object({
  version: z.literal(1),
  recording_url: z.string().min(1),
  tool: z.string(),
  created: z.string().nullable(),
  key: z.string().min(1),
  bpm: z.number(),
  feel: z.string(),
  felt_bpm: z.number(),
  beats_per_bar: z.number().int().positive(),
  segments: z.array(FilePartSchema).min(1),
});

/** What the song page reads. */
export const SongSegmentsReadSchema = z.object({
  recording_url: z.string(),
  analysed_on: z.string().nullable(),
  song_key: z.string(),
  bpm: z.number(),
  feel: z.string(),
  felt_bpm: z.number(),
  beats_per_bar: z.number().int(),
  parts: z.array(SongPartSchema).min(1),
});

export type BassNote = z.infer<typeof BassNoteSchema>;
export type Groove = z.infer<typeof GrooveSchema>;
export type SongPart = z.infer<typeof SongPartSchema>;
export type SegmentsFile = z.infer<typeof SegmentsFileSchema>;
