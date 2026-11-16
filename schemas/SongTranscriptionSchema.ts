import * as z from 'zod';

/**
 * A song's machine transcription from song2logic `study` (table `song_transcriptions`, SNG-12). A note is
 * `[start_s, seconds, midi_pitch, velocity, bar, slot]`; drum parts carry their General MIDI drum note as the
 * pitch. Bars are drawn from `grid.downbeats_s` (seconds of each bar's first beat), not from `bar`/`slot`.
 */
export const TRANSCRIPTION_COLUMNS = [
  'start_s',
  'seconds',
  'pitch',
  'velocity',
  'bar',
  'slot',
] as const;

export const TranscriptionNoteSchema = z.tuple([
  z.number(),
  z.number(),
  z.number().int(),
  z.number().int(),
  z.number().int(),
  z.number().int(),
]);

/** A track read from the table; a track the song does not have comes back as null and counts as empty. */
export const TranscriptionTrackSchema = z
  .array(TranscriptionNoteSchema)
  .nullable()
  .transform((notes) => notes ?? []);

export const TranscriptionGridSchema = z.object({
  bpm: z.number().nullable(),
  beats_per_bar: z.number().int().nullable(),
  downbeats_s: z.array(z.number()).min(1),
});

export const TrackStatsSchema = z.object({
  notes: z.number().int(),
  low: z.number().int().nullable(),
  high: z.number().int().nullable(),
  median: z.number().nullable(),
  per_bar: z.number(),
  active_share: z.number(),
});

/** One `transcriptions/<song id>.json` of a song2logic `strummy-notes` run. */
export const TranscriptionFileSchema = z.object({
  version: z.literal(1),
  recording_url: z.string().min(1),
  created: z.string().nullable(),
  tool: z.string(),
  columns: z.tuple([
    z.literal('start_s'),
    z.literal('seconds'),
    z.literal('pitch'),
    z.literal('velocity'),
    z.literal('bar'),
    z.literal('slot'),
  ]),
  grid: TranscriptionGridSchema,
  tracks: z.record(z.string(), z.array(TranscriptionNoteSchema)),
});

/** What the song page reads: metadata, the grid, and the bass and vocal tracks picked out of `tracks`. */
export const SongTranscriptionReadSchema = z.object({
  recording_url: z.string(),
  transcribed_on: z.string().nullable(),
  grid: TranscriptionGridSchema,
  bass: TranscriptionTrackSchema,
  vocals: TranscriptionTrackSchema,
});

export type TranscriptionNote = z.infer<typeof TranscriptionNoteSchema>;
export type TranscriptionGrid = z.infer<typeof TranscriptionGridSchema>;
export type TrackStats = z.infer<typeof TrackStatsSchema>;
export type TranscriptionFile = z.infer<typeof TranscriptionFileSchema>;
