/**
 * Zod schema for structured chord-sheet extraction output.
 * Used with Vercel AI SDK's generateObject for reliable JSON responses.
 */

import { z } from 'zod';

export const songChordExtractionSchema = z.object({
  capoFret: z
    .number()
    .int()
    .min(0)
    .max(20)
    .nullable()
    .describe('Capo fret position if stated (e.g. "Capo 4"), otherwise null'),
  strummingPattern: z
    .string()
    .max(100)
    .nullable()
    .describe('Strumming pattern if stated (e.g. "D DU UDU"), otherwise null'),
  timeSignature: z
    .number()
    .int()
    .min(1)
    .max(16)
    .nullable()
    .describe('Time signature numerator if stated or clearly implied (e.g. 4 for 4/4), otherwise null'),
  chordsUsed: z
    .array(z.string())
    .describe('Distinct chord names appearing in the sheet, in first-appearance order (e.g. ["G", "C", "D", "Em"])'),
  confidence: z.number().min(0).max(100).describe('Confidence score 0-100 for the extraction overall'),
  reasoning: z.string().describe('Brief explanation of what was found and what was ambiguous'),
  needsManualReview: z.boolean().describe('True if the source text was too messy/ambiguous to trust blindly'),
});

export type SongChordExtractionOutput = z.infer<typeof songChordExtractionSchema>;
