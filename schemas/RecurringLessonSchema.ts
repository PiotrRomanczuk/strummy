import { z } from 'zod';

import { LessonFormatEnum, LessonStatusEnum } from './LessonSchema';

export const RecurringLessonInputSchema = z.object({
  studentId: z.string().uuid('Please select a student'),
  dayOfWeek: z.number().int().min(0).max(6, 'Day of week must be 0 (Sun) to 6 (Sat)'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:mm format'),
  weeks: z.number().int().min(1).max(52, 'Weeks must be between 1 and 52'),
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

export const WEEK_OPTIONS = [
  { value: 4, label: '4 weeks' },
  { value: 6, label: '6 weeks' },
  { value: 8, label: '8 weeks' },
  { value: 12, label: '12 weeks' },
] as const;

export const DAY_OF_WEEK_OPTIONS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' },
] as const;
