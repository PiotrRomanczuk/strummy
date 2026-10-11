import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Data for the Claude Design student dashboard hero ("what do I practice
 * today?"): the next lesson with its teacher, today's practice set built from
 * open assignments, and the last lesson's recap with its homework.
 */

type Person = { name: string | null; email: string | null; color: string | null };

export type StudentHomeLesson = {
  id: string;
  scheduledAt: string;
  durationMinutes: number | null;
  format: string | null;
  notes: string | null;
  teacher: Person;
};

export type PracticeSetItem = {
  assignmentId: string;
  songId: string | null;
  title: string;
  sub: string | null;
  musicalKey: string | null;
  minutes: number;
  isSong: boolean;
  isDoneToday: boolean;
};

export type HomeworkItem = { id: string; task: string; isDone: boolean; daysPracticed: number };

export type StudentLastLesson = { id: string; scheduledAt: string; notes: string | null };

const PERSON_COLS = 'full_name, email, avatar_color';
const DEFAULT_PIECE_MINUTES = 10;

type PersonRow = { full_name: string | null; email: string | null; avatar_color: string | null };
const one = <T>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
const toPerson = (row: PersonRow | null): Person => ({
  name: row?.full_name ?? null,
  email: row?.email ?? null,
  color: row?.avatar_color ?? null,
});

export async function getStudentHomeNextLesson(
  studentId: string,
  now: Date
): Promise<StudentHomeLesson | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select(
      `id, scheduled_at, duration_minutes, format, notes, teacher:profiles!lessons_teacher_id_fkey(${PERSON_COLS})`
    )
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .neq('status', 'CANCELLED')
    .gte('scheduled_at', now.toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) logger.warn('[student-home] next lesson error', { error: error.message });
  if (!data) return null;
  return {
    id: data.id,
    scheduledAt: data.scheduled_at,
    durationMinutes: data.duration_minutes,
    format: data.format,
    notes: data.notes,
    teacher: toPerson(one(data.teacher as PersonRow | PersonRow[] | null)),
  };
}

export async function getStudentLastLesson(
  studentId: string,
  now: Date
): Promise<StudentLastLesson | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('id, scheduled_at, notes')
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .neq('status', 'CANCELLED')
    .lt('scheduled_at', now.toISOString())
    .order('scheduled_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) logger.warn('[student-home] last lesson error', { error: error.message });
  return data ? { id: data.id, scheduledAt: data.scheduled_at, notes: data.notes } : null;
}

/** Practice days per song since `since` — feeds the homework "n/7d" read-out. */
async function practiceDaysBySong(studentId: string, since: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('practice_sessions')
    .select('song_id, created_at')
    .eq('student_id', studentId)
    .gte('created_at', since);
  const days = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    if (!row.song_id) continue;
    const set = days.get(row.song_id) ?? new Set<string>();
    set.add(row.created_at.slice(0, 10));
    days.set(row.song_id, set);
  }
  return days;
}

/** Assignments set at the last lesson — the recap card's homework list. */
export async function getLessonHomework(
  studentId: string,
  lessonId: string,
  now: Date
): Promise<HomeworkItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assignments')
    .select('id, title, description, status, song_id, song:songs(title)')
    .eq('student_id', studentId)
    .eq('lesson_id', lessonId)
    .is('deleted_at', null)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: true });
  if (error) logger.warn('[student-home] homework error', { error: error.message });
  const since = new Date(now.getTime() - 7 * 86_400_000).toISOString();
  const days = await practiceDaysBySong(studentId, since);
  return (data ?? []).map((row) => {
    const song = one(row.song as { title: string } | { title: string }[] | null);
    return {
      id: row.id,
      task: row.title ?? song?.title ?? row.description ?? '—',
      isDone: row.status === 'completed',
      daysPracticed: row.song_id ? (days.get(row.song_id)?.size ?? 0) : 0,
    };
  });
}

/** Today's set list: up to three open assignments, each ticked once practised today. */
export async function getStudentPracticeSet(
  studentId: string,
  now: Date
): Promise<PracticeSetItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assignments')
    .select('id, title, description, daily_target_minutes, song_id, song:songs(title, key)')
    .eq('student_id', studentId)
    .is('deleted_at', null)
    .in('status', ['not_started', 'in_progress', 'overdue'])
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(3);
  if (error) logger.warn('[student-home] practice set error', { error: error.message });
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const practised = await practiceDaysBySong(studentId, today.toISOString());
  return (data ?? []).map((row) => {
    const song = one(row.song as { title: string; key: string | null }[] | null);
    return {
      assignmentId: row.id,
      songId: row.song_id,
      title: song?.title ?? row.title ?? '—',
      sub: row.description ?? null,
      musicalKey: song?.key ?? null,
      minutes: row.daily_target_minutes ?? DEFAULT_PIECE_MINUTES,
      isSong: Boolean(song),
      isDoneToday: row.song_id ? practised.has(row.song_id) : false,
    };
  });
}
