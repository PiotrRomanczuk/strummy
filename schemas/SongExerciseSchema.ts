import * as z from 'zod';

import { PracticeTempoPercentSchema } from './PracticeTempoSchema';

/** A song exercise (`song_exercises`, #1146): one part of a song saved by the teacher under a name. */

export const EXERCISE_KINDS = ['riff', 'chords', 'strum', 'other'] as const;
export const EXERCISE_SOURCES = ['recording', 'backing'] as const;

export type ExerciseKind = (typeof EXERCISE_KINDS)[number];
export type ExerciseSource = (typeof EXERCISE_SOURCES)[number];

export const EXERCISE_NAME_MAX = 80;
export const EXERCISE_NOTE_MAX = 500;

/** What the card's "Save as exercise" sends; the recording URL is derived on the server from the video id. */
export const CreateSongExerciseSchema = z.object({
  songId: z.string().uuid(),
  videoId: z
    .string()
    .regex(/^[\w-]{11}$/)
    .nullable(),
  partN: z.number().int().min(1).max(1000),
  name: z.string().trim().min(1).max(EXERCISE_NAME_MAX),
  kind: z.enum(EXERCISE_KINDS),
  tempoPercent: PracticeTempoPercentSchema,
  source: z.enum(EXERCISE_SOURCES),
  note: z
    .string()
    .trim()
    .max(EXERCISE_NOTE_MAX)
    .nullish()
    .transform((note) => (note ? note : null)),
});

export type CreateSongExerciseInput = z.input<typeof CreateSongExerciseSchema>;

const SongRef = z.object({
  title: z.string().nullable(),
  author: z.string().nullable(),
  deleted_at: z.string().nullable(),
});

/** A stored row with its song; PostgREST gives an embedded to-one relation as an object (or a one-item array). */
export const SongExerciseRowSchema = z.object({
  id: z.string().uuid(),
  song_id: z.string().uuid(),
  part_n: z.number().int(),
  name: z.string(),
  kind: z.enum(EXERCISE_KINDS),
  tempo_percent: z.number().int(),
  source: z.enum(EXERCISE_SOURCES),
  note: z.string().nullable(),
  created_at: z.string(),
  songs: z.union([SongRef, z.array(SongRef).max(1)]).nullable(),
});

export interface SongExercise {
  id: string;
  songId: string;
  songTitle: string | null;
  songAuthor: string | null;
  partN: number;
  name: string;
  kind: ExerciseKind;
  tempoPercent: number;
  source: ExerciseSource;
  note: string | null;
  createdAt: string;
}
