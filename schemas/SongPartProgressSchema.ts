import * as z from 'zod';

/** A student's tempo on one part of a song (`student_song_progress`, #1136). */
export const SongPartTempoInputSchema = z.object({
  studentId: z.string().uuid(),
  songId: z.string().uuid(),
  /** The form letter from `song_segments.parts[].label`; null = the whole song. */
  partLabel: z.string().min(1).max(16).nullable(),
  /** Percent of the original tempo played with the recording; 100 = full speed. */
  tempoPercent: z.number().int().min(1).max(200),
  lessonId: z.string().uuid().optional(),
});

export type SongPartTempoInput = z.infer<typeof SongPartTempoInputSchema>;
