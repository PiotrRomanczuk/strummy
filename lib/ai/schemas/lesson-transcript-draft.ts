/**
 * Zod schema for the lesson-transcript-draft agent (CNT-8).
 *
 * Mirrors the analysis tree in docs/app-blueprint/09-content-production.md:
 * gate → lesson meta → songs → homework → skills → notes → teacher
 * commitments → profile hints → logistics. Every proposal carries a
 * `confidence` (0–1) and a short `evidence` paraphrase so the teacher can
 * judge it; nothing here is written anywhere until the teacher applies it.
 */

import { z } from 'zod';

export const LESSON_SONG_STATUSES = [
  'to_learn',
  'started',
  'slow_tempo',
  'remembered',
  'with_author',
  'mastered',
] as const;

export const SKILL_STATUSES = ['developing', 'progressing', 'proficient', 'mastered'] as const;

export const SUBMISSION_TYPES = ['self_report', 'audio', 'video', 'note'] as const;

/**
 * Models without structured output (the registry path) sometimes return an
 * unknown enum value or drop a field. Each such field falls back to the value
 * that writes nothing by default — a low confidence, "mentioned", no status —
 * so one bad field costs that item's pre-tick, not the whole draft.
 */
const LOW_CONFIDENCE = 0.3;

const confidence = z
  .number()
  .min(0)
  .max(1)
  .catch(LOW_CONFIDENCE)
  .describe('0–1: how sure the transcript supports this');
const evidence = z
  .string()
  .max(300)
  .catch('')
  .describe('Short paraphrase of the transcript passage this is based on (no names)');
const bullets = (what: string) =>
  z.array(z.string().max(300)).max(10).catch([]).describe(what);

export const draftSongSchema = z.object({
  heardTitle: z.string().min(1).max(200).describe('Song title as said, corrected for obvious mishearing'),
  heardArtist: z.string().max(200).nullable().describe('Artist if said or certain, else null'),
  catalogTitle: z
    .string()
    .max(200)
    .nullable()
    .describe('Exact title from the provided "known songs" list when it is clearly that song, else null'),
  role: z
    .enum(['practiced', 'reviewed', 'homework', 'mentioned'])
    .catch('mentioned')
    .describe('practiced = worked on now; reviewed = repeated from before; homework = set for home; mentioned = only talked about'),
  status: z
    .enum(LESSON_SONG_STATUSES)
    .nullable()
    .catch(null)
    .describe('Progress stage reached in this lesson, null if unclear'),
  sections: bullets('Parts worked on, e.g. "intro riff", "refren"'),
  notes: bullets('Student-specific tips, mistakes and what to practise for this song (Polish)'),
  songFacts: z
    .object({
      capoFret: z.number().int().min(0).max(20).nullable().catch(null),
      strummingPattern: z.string().max(100).nullable().catch(null),
      chords: z.array(z.string().max(20)).max(30).catch([]),
    })
    .catch({ capoFret: null, strummingPattern: null, chords: [] })
    .describe('Facts true for the song itself (not this student); null/empty when not stated'),
  confidence,
  evidence,
});

export const draftAssignmentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  checklist: z.array(z.string().min(1).max(200)).max(10).describe('Concrete steps for the student (Polish)'),
  songTitles: z.array(z.string().max(200)).max(5).describe('heardTitle values of the songs this homework is about'),
  dailyTargetMinutes: z.number().int().min(1).max(240).nullable().describe('Only when a number was said'),
  submissionType: z.enum(SUBMISSION_TYPES).catch('self_report'),
  isExplicit: z.boolean().describe('true when homework was set explicitly ("praca domowa", "na następny raz")'),
  confidence,
  evidence,
});

export const draftSkillSchema = z.object({
  skillName: z.string().min(1).max(200).describe('Exact name from the provided skills catalog, or a short new name'),
  isFromCatalog: z.boolean(),
  status: z.enum(SKILL_STATUSES).catch('developing'),
  note: z.string().max(500).describe('What to improve, Polish'),
  confidence,
  evidence,
});

export const lessonTranscriptDraftSchema = z.object({
  isGuitarLesson: z.boolean().describe('false for calls, tests, or non-guitar lessons — then leave the rest empty'),
  lessonTitle: z.string().max(80).nullable().describe('3–6 word Polish topic of the lesson'),
  songs: z.array(draftSongSchema).max(12),
  assignment: draftAssignmentSchema.nullable(),
  skills: z.array(draftSkillSchema).max(10),
  notes: z.object({
    technique: bullets('Technique work outside specific songs'),
    theory: bullets('Theory explained: scales, intervals, rhythm, reading tab'),
    wentWell: bullets('What went well, concretely'),
    needsWork: bullets('What needs more work'),
    other: bullets('Gear, tuning, practice habits worth remembering'),
  }),
  teacherCommitments: bullets('Things the TEACHER promised to do ("wyślę ci…")'),
  profileHints: bullets('Lasting facts about the student: musical taste, goals. Nothing sensitive'),
  logistics: bullets('Rescheduling, payments, holidays — reported, never written'),
  questions: bullets('What the teacher must clarify, e.g. a song described but never named'),
});

export type DraftSong = z.infer<typeof draftSongSchema>;
export type DraftAssignment = z.infer<typeof draftAssignmentSchema>;
export type DraftSkill = z.infer<typeof draftSkillSchema>;
export type LessonTranscriptDraft = z.infer<typeof lessonTranscriptDraftSchema>;

/** A draft song after catalog matching (lesson-transcript-draft service). */
export const songMatchSchema = z.object({
  songId: z.string().uuid().nullable(),
  title: z.string().nullable(),
  author: z.string().nullable(),
  score: z.number().min(0).max(1),
});

/** What is stored in lesson_transcripts.draft: the agent output + resolved ids. */
export const resolvedLessonDraftSchema = lessonTranscriptDraftSchema.extend({
  songs: z.array(draftSongSchema.extend({ match: songMatchSchema })).max(12),
  skills: z.array(draftSkillSchema.extend({ skillId: z.string().uuid().nullable() })).max(10),
});

export type SongMatch = z.infer<typeof songMatchSchema>;
export type ResolvedLessonDraft = z.infer<typeof resolvedLessonDraftSchema>;
