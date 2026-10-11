import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { bucketPracticeDays, type PracticeDay } from './parent-health.helpers';

/**
 * Read-only "health" queries shared by the student dashboard and the parent
 * Family portal: how much a student practiced, what lessons are coming up, and
 * the latest note their teacher left. Parents reach the same rows through the
 * *_select_parent RLS policies (scoped to their linked children).
 */

export type UpcomingLesson = {
  id: string;
  scheduledAt: string;
  title: string | null;
  teacherName: string | null;
};

export type LatestNote = {
  lessonId: string;
  note: string;
  teacherName: string | null;
  lessonDate: string;
};

const PRACTICE_WINDOW_DAYS = 7;

/** Practice minutes bucketed into a fixed 7-day window ending on `now`. */
export async function getStudentPracticeHistory(
  studentId: string,
  now: Date = new Date(),
  days: number = PRACTICE_WINDOW_DAYS
): Promise<PracticeDay[]> {
  const supabase = await createClient();
  const since = new Date(now);
  since.setUTCDate(since.getUTCDate() - (days - 1));
  since.setUTCHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('practice_sessions')
    .select('created_at, duration_minutes, songs:song_id(title)')
    .eq('student_id', studentId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    logger.warn('[student-health] practice history error', { error: error.message });
    return bucketPracticeDays([], now, days);
  }

  const sessions = (data ?? []).map((row) => {
    const song = Array.isArray(row.songs) ? row.songs[0] : row.songs;
    return {
      createdAt: (row.created_at as string) ?? null,
      minutes: (row.duration_minutes as number) ?? 0,
      songTitle: (song as { title: string } | null)?.title ?? null,
    };
  });
  return bucketPracticeDays(sessions, now, days);
}

export async function getStudentUpcomingLessons(
  studentId: string,
  limit = 3
): Promise<UpcomingLesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('id, scheduled_at, title, teacher:profiles!lessons_teacher_id_fkey(full_name)')
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error) {
    logger.warn('[student-health] upcoming lessons error', { error: error.message });
    return [];
  }

  return (data ?? []).map((row) => {
    const teacher = Array.isArray(row.teacher) ? row.teacher[0] : row.teacher;
    return {
      id: row.id as string,
      scheduledAt: row.scheduled_at as string,
      title: (row.title as string) ?? null,
      teacherName: (teacher?.full_name as string) ?? null,
    };
  });
}

/** Most recent non-empty note from a lesson that has already happened. A future
 *  lesson's notes are the teacher's plan, not a note "after the lesson". */
export async function getStudentLatestNote(
  studentId: string,
  now: Date = new Date()
): Promise<LatestNote | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('id, scheduled_at, notes, teacher:profiles!lessons_teacher_id_fkey(full_name)')
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .not('notes', 'is', null)
    .neq('notes', '')
    .lte('scheduled_at', now.toISOString())
    .order('scheduled_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    if (error) logger.warn('[student-health] latest note error', { error: error.message });
    return null;
  }

  const teacher = Array.isArray(data.teacher) ? data.teacher[0] : data.teacher;
  return {
    lessonId: data.id as string,
    note: data.notes as string,
    teacherName: (teacher?.full_name as string) ?? null,
    lessonDate: data.scheduled_at as string,
  };
}
