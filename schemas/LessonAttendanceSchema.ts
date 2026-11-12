import { z } from 'zod';

/** What the teacher says about a lesson whose time has passed. */
export const AttendanceOutcomeEnum = z.enum(['held', 'not_held']);
export type AttendanceOutcome = z.infer<typeof AttendanceOutcomeEnum>;

export const LessonAttendanceSchema = z.object({
  lessonId: z.string().uuid(),
  outcome: AttendanceOutcomeEnum,
});
export type LessonAttendanceInput = z.infer<typeof LessonAttendanceSchema>;
