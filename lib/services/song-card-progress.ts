import * as z from 'zod';

import { getStudentOptions, type StudentOption } from './lesson-form-data';
import { getSongProgressMarks } from './song-part-progress';
import type { SongProgressMark } from './song-part-progress.helpers';

export interface SongCardProgressData {
  students: StudentOption[];
  /** Only a student from the viewer's own roster; anything else in the address is ignored. */
  studentId: string | null;
  lessonId: string | null;
  marks: SongProgressMark[];
}

const UUID = z.string().uuid();

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * What the song card's progress panel needs (#1136): the teacher's students, the one picked in the address
 * (`?student=<id>&lesson=<id>`), and that student's marks for this song. Staff only; RLS scopes every read.
 */
export async function getSongCardProgress(
  songId: string,
  viewer: { profileId: string; isAdmin: boolean },
  query: Record<string, string | string[] | undefined>
): Promise<SongCardProgressData> {
  const students = await getStudentOptions(viewer.profileId, viewer.isAdmin);
  const wanted = one(query.student);
  const studentId = students.some((s) => s.id === wanted) ? (wanted ?? null) : null;
  const lesson = UUID.safeParse(one(query.lesson));
  return {
    students,
    studentId,
    lessonId: studentId && lesson.success ? lesson.data : null,
    marks: studentId ? await getSongProgressMarks(studentId, songId) : [],
  };
}
