import { z } from 'zod';

import { LessonFormatEnum, LessonStatusEnum } from './LessonSchema';
import { VALIDATION_KEYS as V } from './shared/validation-keys';

export const RecurringLessonInputSchema = z.object({
  studentId: z.string().uuid(V.selectStudent),
  dayOfWeek: z.number().int().min(0).max(6, V.dayOfWeekRange),
  time: z.string().regex(/^\d{2}:\d{2}$/, V.timeFormatInvalid),
  weeks: z.number().int().min(1).max(52, V.weeksRange),
  startDate: z.string().optional(),
  titleTemplate: z.string().optional(),
  songIds: z.array(z.string().uuid()).optional(),
  // Carried from the lesson form so a repeating series keeps the same shape as
  // the single lesson the teacher filled in — dropping these silently created
  // lessons with a null duration/format and a forced SCHEDULED status.
  durationMinutes: z.number().int().positive().optional(),
  format: LessonFormatEnum.optional(),
  notes: z.string().optional(),
  status: LessonStatusEnum.optional(),
});

export type RecurringLessonInput = z.infer<typeof RecurringLessonInputSchema>;

// Labels live in messages/*.json under Lessons.weeks4/6/8/12 — see
// components/lessons/form/LessonForm.Recurring.tsx.
export const WEEK_OPTIONS = [{ value: 4 }, { value: 6 }, { value: 8 }, { value: 12 }] as const;

export const DAY_OF_WEEK_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
] as const;
