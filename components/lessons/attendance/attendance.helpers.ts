import type { LessonRow } from '@/lib/services/lessons-queries';

/**
 * A lesson whose time has come and that nobody has answered for yet. Nothing
 * closes a SCHEDULED lesson on its own, so "the date passed" is the only signal.
 */
export const isAwaitingConfirmation = (lesson: LessonRow, now: Date): boolean => {
  const status = lesson.status.toUpperCase();
  if (status !== 'SCHEDULED' && status !== 'IN_PROGRESS') return false;
  return new Date(lesson.scheduledAt).getTime() <= now.getTime();
};

export type StudentAttendance = {
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  held: number;
  notHeld: number;
  awaiting: number;
};

/**
 * Per-student counts for lessons that have already started. Future lessons are
 * left out: the summary answers "what happened", not "what is planned".
 * Sorted by student so the table does not reshuffle between renders.
 */
export const summariseAttendance = (lessons: LessonRow[], now: Date): StudentAttendance[] => {
  const byStudent = new Map<string, StudentAttendance>();

  for (const lesson of lessons) {
    if (new Date(lesson.scheduledAt).getTime() > now.getTime()) continue;

    const row = byStudent.get(lesson.studentId) ?? {
      studentId: lesson.studentId,
      studentName: lesson.studentName,
      studentEmail: lesson.studentEmail,
      held: 0,
      notHeld: 0,
      awaiting: 0,
    };
    const status = lesson.status.toUpperCase();
    if (status === 'COMPLETED') row.held += 1;
    else if (status === 'CANCELLED') row.notHeld += 1;
    else row.awaiting += 1;
    byStudent.set(lesson.studentId, row);
  }

  const label = (r: StudentAttendance) => (r.studentName ?? r.studentEmail ?? '').toLowerCase();
  return [...byStudent.values()].sort((a, b) => label(a).localeCompare(label(b)));
};
