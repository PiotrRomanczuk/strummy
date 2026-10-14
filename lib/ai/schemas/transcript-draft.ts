/**
 * Zod schemas for the transcript → lesson draft (CNT-6 / CNT-8).
 *
 * Two shapes on purpose:
 * - `TranscriptDraftOutputSchema` is what the model fills in. Notes are three
 *   bullet arrays — a free-tier model given "a string with three sections"
 *   returns a sectioned object anyway (seen 2026-10-14), so the schema asks
 *   for the structure it wants to produce.
 * - `TranscriptDraftSchema` is what is stored and reviewed: `notes_pl` is the
 *   formatted string the teacher appends to `lessons.notes`.
 *
 * Every item is a *proposal* — nothing is written to the lesson until the
 * teacher clicks it (doc 08 contract).
 */

import { z } from 'zod';

export const SONG_PROGRESS_STATUSES = [
  'to_learn',
  'started',
  'remembered',
  'with_author',
  'mastered',
] as const;

export const DraftSongSchema = z.object({
  title: z.string().min(1).max(200).describe('Song title as it would appear in a catalogue'),
  artist: z.string().max(200).optional().describe('Artist or band when it was said or is obvious'),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe('How sure you are this song was actually discussed (0–1)'),
  sentiment: z
    .enum(['enthusiastic', 'neutral'])
    .describe('enthusiastic only when the teacher or student was clearly excited about it'),
  suggested_status: z
    .enum(SONG_PROGRESS_STATUSES)
    .describe('Where the student is with this song after the lesson'),
  quotes: z
    .array(z.string().max(300))
    .max(3)
    .describe('Up to 3 short verbatim fragments from the transcript that mention the song'),
});

export const DraftHomeworkSchema = z.object({
  title: z.string().min(1).max(120).describe('Short imperative title, Polish'),
  description: z.string().max(600).describe('What exactly to practise and how, Polish'),
});

const bullets = (what: string) =>
  z.array(z.string().min(1).max(300)).max(6).describe(`${what} — short Polish bullets`);

const draftTail = {
  songs: z.array(DraftSongSchema).max(8).describe('Only songs that were really mentioned'),
  homework: z.array(DraftHomeworkSchema).max(5),
  next_lesson: z
    .array(z.string().max(300))
    .max(5)
    .describe('Short Polish bullets for what to pick up next time'),
};

export const DraftNotesSchema = z.object({
  practised: bullets(
    'Co ćwiczyliśmy: exercises, techniques, song fragments (strings, frets, tempo)'
  ),
  went_well: bullets('Co poszło: what the student did well or better than last time'),
  watch_out: bullets('Na co uważać: technical mistakes and habits to fix'),
});

/** Shape the model fills in. */
export const TranscriptDraftOutputSchema = z.object({
  notes: DraftNotesSchema,
  ...draftTail,
});

/** Shape stored in `ai_workflow_runs` and reviewed on the lesson page. */
export const TranscriptDraftSchema = z.object({
  notes_pl: z.string().max(2000),
  ...draftTail,
});

export type TranscriptDraftOutput = z.infer<typeof TranscriptDraftOutputSchema>;
export type TranscriptDraft = z.infer<typeof TranscriptDraftSchema>;
export type DraftSong = z.infer<typeof DraftSongSchema>;
export type DraftHomework = z.infer<typeof DraftHomeworkSchema>;
export type DraftNotes = z.infer<typeof DraftNotesSchema>;

const NOTE_SECTIONS: [keyof DraftNotes, string][] = [
  ['practised', 'Co ćwiczyliśmy'],
  ['went_well', 'Co poszło'],
  ['watch_out', 'Na co uważać'],
];

/** "Co ćwiczyliśmy\n- …\n\nCo poszło\n- …" — empty sections are skipped; capped at 2000 chars. */
export function formatDraftNotes(notes: DraftNotes): string {
  const text = NOTE_SECTIONS.filter(([key]) => notes[key].length > 0)
    .map(
      ([key, heading]) =>
        `${heading}\n${notes[key].map((line) => `- ${line.replace(/^-\s*/, '').trim()}`).join('\n')}`
    )
    .join('\n\n');
  return text.length > 2000 ? `${text.slice(0, 1999)}…` : text;
}

export function toTranscriptDraft(output: TranscriptDraftOutput): TranscriptDraft {
  return TranscriptDraftSchema.parse({
    notes_pl: formatDraftNotes(output.notes),
    songs: output.songs,
    homework: output.homework,
    next_lesson: output.next_lesson,
  });
}
