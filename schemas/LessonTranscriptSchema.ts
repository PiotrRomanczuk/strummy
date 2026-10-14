import * as z from 'zod';

import { LYRICS_MAX_LENGTH } from './CommonSchema';

/** Mirrors the `transcript_source` Postgres enum. */
export const TranscriptSourceEnum = z.enum(['wispr', 'paste', 'upload']);
export type TranscriptSource = z.infer<typeof TranscriptSourceEnum>;

export const TRANSCRIPT_SUMMARY_MAX_LENGTH = 20_000;
/** Same ceiling as a full tab/transcription paste — see `LYRICS_MAX_LENGTH`. */
export const TRANSCRIPT_BODY_MAX_LENGTH = LYRICS_MAX_LENGTH;

/**
 * Body of `POST /api/transcripts/ingest` — what an external recorder (Wispr
 * Flow via a scripted client) sends to attach a transcript to a lesson. The
 * student is identified by email only; the lesson is matched on time.
 */
export const TranscriptIngestSchema = z.object({
  source: TranscriptSourceEnum,
  external_id: z.string().trim().min(1).max(200),
  started_at: z.string().datetime({ offset: true }),
  ended_at: z.string().datetime({ offset: true }).optional(),
  student_email: z.string().trim().email(),
  student_name: z.string().trim().max(200).optional(),
  title: z.string().trim().max(200).optional(),
  summary: z.string().max(TRANSCRIPT_SUMMARY_MAX_LENGTH).optional(),
  transcript: z.string().min(20).max(TRANSCRIPT_BODY_MAX_LENGTH),
  language: z.enum(['pl', 'en']).default('pl'),
  share_link: z.string().url().optional(),
});

export type TranscriptIngestInput = z.infer<typeof TranscriptIngestSchema>;
