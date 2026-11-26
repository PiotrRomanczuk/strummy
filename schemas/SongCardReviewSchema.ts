import * as z from 'zod';

/** The teacher's review of a song card (`song_card_reviews`, SNG-17): what the card's actions accept and store. */

const GROUP = z.string().min(1).max(80);
/** A chord name as the card spells it: root, accidental and a short suffix ("F#m", "Cmaj7/B"). */
const CHORD = z.string().regex(/^[A-G][#b]?[A-Za-z0-9#b/+()]{0,10}$/);
/** One bar of strum: 16 marks, d down, u up, m muted, . rest. */
const STRUM_CODE = z.string().regex(/^[dum.]{16}$/);

export const ReviewPatchSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('approve'), group: GROUP, isApproved: z.boolean() }),
  z.object({ kind: z.literal('strum'), group: GROUP, code: STRUM_CODE.nullable() }),
  z.object({
    kind: z.literal('chord'),
    bar: z.number().int().min(0).max(2000),
    chord: CHORD.nullable(),
  }),
]);

/** A stored row as the card reads it; bar keys arrive as strings from jsonb. */
export const SongCardReviewRowSchema = z.object({
  recording_url: z.string(),
  approved_groups: z.array(GROUP),
  strums: z.record(GROUP, STRUM_CODE),
  chord_edits: z.record(z.string().regex(/^\d+$/), CHORD),
});

export type SongCardReviewRow = z.infer<typeof SongCardReviewRowSchema>;
