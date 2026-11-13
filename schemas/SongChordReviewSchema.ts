import * as z from 'zod';

/**
 * A song's chord review from song2logic `chord-review` (row `chord-compare` of `song_analysis_sources`): the
 * song's `chords` against what its recording sounds like. The reference is Logic's Chord ID when the song has
 * one, else song2logic `analyze`. Chord names: `audio` is sounding pitch, `sheet` as written in Strummy.
 *
 * status: agree · conflict (the data-quality queue) · check (a difference only `analyze` saw — it often mistakes
 * major for minor, so it is a hint, not a verdict) · no_sheet · no_audio · unreadable_sheet (a tab, not chords).
 */
export const CHORD_REVIEW_STATUSES = [
  'agree',
  'conflict',
  'check',
  'no_sheet',
  'no_audio',
  'unreadable_sheet',
] as const;

const VoteSchema = z.enum(['audio', 'sheet', 'both', 'neither']).nullable();

export const ChordDifferenceSchema = z.object({
  kind: z.enum(['mode', 'relative', 'missing_in_sheet', 'not_heard']),
  audio: z.string().nullable(),
  audio_as_written: z.string().nullable(),
  sheet: z.string().nullable(),
  share: z.number(),
  first_s: z.number().nullable(),
  confirmed: z.boolean(),
  analyze: VoteSchema,
  chordonomicon: VoteSchema,
});

export const SongChordReviewSchema = z.object({
  version: z.number().int(),
  status: z.enum(CHORD_REVIEW_STATUSES),
  reference: z.enum(['chord-id', 'analyze']).nullable(),
  sources: z.array(z.string()),
  sheet_chords: z.array(z.string()),
  heard_chords: z.array(z.string()),
  main_chords: z.array(z.string()),
  transpose: z.number().int().optional(),
  coverage: z.number().optional(),
  capo_hint: z.number().int().nullable().optional(),
  capo_matches: z.boolean().nullable().optional(),
  differences: z.array(ChordDifferenceSchema).optional(),
  keys: z.record(z.string(), z.string()),
  key_sources_agree: z.boolean(),
  sounding_key: z.object({ tonic: z.string(), scale: z.enum(['major', 'minor']) }).nullable(),
});

export type ChordReviewStatus = (typeof CHORD_REVIEW_STATUSES)[number];
export type ChordDifference = z.infer<typeof ChordDifferenceSchema>;
export type SongChordReview = z.infer<typeof SongChordReviewSchema>;
