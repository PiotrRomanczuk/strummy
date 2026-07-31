import * as z from 'zod';
import { VALIDATION_KEYS as V } from './shared/validation-keys';

// Lesson status enum - matches database enum Database["public"]["Enums"]["LessonStatus"]
export const LessonStatusEnum = z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
export type LessonStatus = z.infer<typeof LessonStatusEnum>;

// Lesson delivery format - matches the `lessons_format_check` DB constraint
export const LessonFormatEnum = z.enum(['in_person', 'video']);
export type LessonFormat = z.infer<typeof LessonFormatEnum>;

// Shared duration bound (mirrors the `lessons_duration_minutes_check` constraint)
const durationMinutesField = z
  .number()
  .int(V.durationWholeNumber)
  .min(15, V.durationMinLength)
  .max(180, V.durationMaxLength);

// Lesson schema for validation
export const LessonSchema = z.object({
  id: z.string().uuid().optional(), // UUID, auto-generated
  student_id: z.string().uuid(V.studentIdRequired),
  teacher_id: z.string().uuid(V.teacherIdRequired),
  creator_user_id: z.string().uuid().optional(),
  lesson_number: z.number().int().positive().nullable().optional(),
  lesson_teacher_number: z.number().int().positive().nullable().optional(),
  title: z.string().min(1, V.titleRequired).nullable().optional(),
  notes: z.string().nullable().optional(),
  date: z.string().nullable().optional(), // ISO date string from database
  start_time: z.string().nullable().optional(), // time (ISO or HH:mm)
  scheduled_at: z.string().nullable().optional(), // ISO datetime from database
  status: LessonStatusEnum.default('SCHEDULED'),
  duration_minutes: durationMinutesField.nullable().optional(),
  format: LessonFormatEnum.nullable().optional(),
  created_at: z.string().nullable().optional(), // ISO date string from database
  updated_at: z.string().nullable().optional(), // ISO date string from database
});

// Lesson input schema for creating/updating lessons
export const LessonInputSchema = z.object({
  student_id: z.string().min(1, V.selectStudent).uuid(V.studentMustBeValidUser),
  teacher_id: z.string().min(1, V.selectTeacher).uuid(V.teacherMustBeValidUser),
  title: z.string().min(1, V.titleRequired).optional(),
  notes: z.string().optional(),
  date: z.string().optional(), // Date string (YYYY-MM-DD) - optional if scheduled_at is provided
  start_time: z.string().optional(), // time (HH:mm)
  scheduled_at: z.string().min(1, V.scheduledDateTimeRequired), // ISO date string or datetime-local format
  status: LessonStatusEnum.optional(),
  duration_minutes: durationMinutesField.optional(),
  format: LessonFormatEnum.optional(),
  song_ids: z.array(z.string().uuid()).optional(),
});

export type LessonInput = z.infer<typeof LessonInputSchema>;
export type Lesson = z.infer<typeof LessonSchema>;

// Lesson with profile information
export const LessonWithProfilesSchema = LessonSchema.extend({
  profile: z
    .object({
      id: z.string().uuid(),
      full_name: z.string().nullable(),
      email: z.string().email(),
    })
    .optional()
    .nullable(),
  teacher_profile: z
    .object({
      id: z.string().uuid(),
      full_name: z.string().nullable(),
      email: z.string().email(),
    })
    .optional()
    .nullable(),
  lesson_songs: z
    .array(
      z.object({
        song: z
          .object({
            title: z.string(),
          })
          .nullable(),
      })
    )
    .optional(),
  assignments: z
    .array(
      z.object({
        title: z.string(),
      })
    )
    .optional(),
});

export type LessonWithProfiles = z.infer<typeof LessonWithProfilesSchema>;

// Lesson song status enum
export const SongStatusEnum = z.enum([
  'to_learn',
  'started',
  'remembered',
  'with_author',
  'mastered',
]);

// Lesson song relationship schema
export const LessonSongSchema = z.object({
  lesson_id: z.string().uuid(),
  song_id: z.string().uuid(),
  song_status: SongStatusEnum.default('to_learn'),
});

export type LessonSong = z.infer<typeof LessonSongSchema>;
