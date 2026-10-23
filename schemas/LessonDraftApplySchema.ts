import * as z from 'zod';

import {
  LESSON_SONG_STATUSES,
  SKILL_STATUSES,
  SUBMISSION_TYPES,
} from '@/lib/ai/schemas/lesson-transcript-draft';

/**
 * What the teacher approves from a transcript draft (CNT-8) — the body of
 * `POST /api/lessons/[id]/transcript-draft/apply` and of the card's server
 * action. Every field is already decided: the apply step writes exactly this,
 * it never re-reads the model's proposal.
 */

export const LESSON_NOTES_MAX_LENGTH = 10_000;

export const ApplySongSchema = z
  .object({
    songId: z.string().uuid().nullable(),
    /** A song not in the catalog yet — created as a draft song (is_draft). */
    newSong: z
      .object({ title: z.string().trim().min(1).max(200), author: z.string().trim().max(200).nullable() })
      .nullable(),
    status: z.enum(LESSON_SONG_STATUSES),
    notes: z.string().max(2000),
  })
  .refine((s) => (s.songId === null) !== (s.newSong === null), {
    message: 'Exactly one of songId or newSong is required',
  });

export const ApplyAssignmentSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000),
  checklist: z.array(z.string().trim().min(1).max(200)).max(20),
  songId: z.string().uuid().nullable(),
  /** YYYY-MM-DD; null = due at the student's next lesson (or no due date). */
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  dailyTargetMinutes: z.number().int().min(1).max(240).nullable(),
  submissionType: z.enum(SUBMISSION_TYPES),
});

export const ApplySkillSchema = z.object({
  skillId: z.string().uuid(),
  status: z.enum(SKILL_STATUSES),
  note: z.string().max(500),
});

export const LessonDraftApplySchema = z.object({
  lessonTitle: z.string().trim().max(200).nullable(),
  /** Appended below the lesson's existing notes, never replacing them. */
  notes: z.string().max(LESSON_NOTES_MAX_LENGTH),
  /**
   * Sets the lesson COMPLETED. That fires tr_notify_lesson_completed, which
   * queues the lesson recap email to the student — so it is opt-in.
   */
  markCompleted: z.boolean(),
  songs: z.array(ApplySongSchema).max(12),
  assignment: ApplyAssignmentSchema.nullable(),
  skills: z.array(ApplySkillSchema).max(10),
});

export type ApplySong = z.infer<typeof ApplySongSchema>;
export type ApplyAssignment = z.infer<typeof ApplyAssignmentSchema>;
export type ApplySkill = z.infer<typeof ApplySkillSchema>;
export type LessonDraftApply = z.infer<typeof LessonDraftApplySchema>;
