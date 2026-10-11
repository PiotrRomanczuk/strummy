import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import {
  ChecklistSchema,
  ChordDrillSchema,
  ChordDrillResultSchema,
  type ChecklistItem,
  type ChordDrill,
  type ChordDrillResult,
} from '@/schemas/AssignmentSchema';

export type AssignmentDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: string | null;
  teacherId: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  teacherName: string | null;
  song: { id: string; title: string; author: string | null; chords: string | null } | null;
  lesson: { id: string; scheduledAt: string | null } | null;
  checklist: ChecklistItem[];
  chordDrill: ChordDrill | null;
  chordDrillResult: ChordDrillResult | null;
  dailyTargetMinutes: number | null;
  submissionType: string;
  createdAt: string;
  updatedAt: string;
};

type EmbeddedProfile = { full_name: string | null; email: string | null } | null;
type EmbeddedSong = {
  id: string;
  title: string;
  author: string | null;
  chords?: string | null;
} | null;
type EmbeddedLesson = { id: string; scheduled_at: string | null } | null;

const one = <T>(value: T | T[] | null | undefined): T | null =>
  (Array.isArray(value) ? (value[0] ?? null) : (value ?? null)) as T | null;

/** Load a single assignment for the detail/edit pages (RLS-scoped). Null if hidden/deleted. */
export async function getAssignmentDetail(assignmentId: string): Promise<AssignmentDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assignments')
    .select(
      'id, title, description, status, due_date, teacher_id, student_id, checklist, chord_drill, chord_drill_result, daily_target_minutes, submission_type, created_at, updated_at, student:profiles!assignments_student_id_fkey(full_name, email), teacher:profiles!assignments_teacher_id_fkey(full_name), song:songs(id, title, author, chords), lesson:lessons(id, scheduled_at)'
    )
    .eq('id', assignmentId)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    if (error && error.code !== 'PGRST116') {
      logger.warn('[assignment-detail-queries] error', { error: error.message, code: error.code });
    }
    return null;
  }

  const student = one<EmbeddedProfile>(data.student as EmbeddedProfile | EmbeddedProfile[]);
  const teacher = one<EmbeddedProfile>(data.teacher as EmbeddedProfile | EmbeddedProfile[]);
  const song = one<EmbeddedSong>(data.song as EmbeddedSong | EmbeddedSong[]);
  const lesson = one<EmbeddedLesson>(data.lesson as EmbeddedLesson | EmbeddedLesson[]);

  return {
    id: data.id as string,
    title: data.title as string,
    description: (data.description as string) ?? null,
    status: data.status as string,
    dueDate: (data.due_date as string) ?? null,
    teacherId: data.teacher_id as string,
    studentId: data.student_id as string,
    studentName: student?.full_name ?? null,
    studentEmail: student?.email ?? null,
    teacherName: teacher?.full_name ?? null,
    song: song
      ? { id: song.id, title: song.title, author: song.author ?? null, chords: song.chords ?? null }
      : null,
    lesson: lesson ? { id: lesson.id, scheduledAt: lesson.scheduled_at ?? null } : null,
    checklist: ChecklistSchema.safeParse(data.checklist).data ?? [],
    chordDrill: ChordDrillSchema.safeParse(data.chord_drill).data ?? null,
    chordDrillResult: ChordDrillResultSchema.safeParse(data.chord_drill_result).data ?? null,
    dailyTargetMinutes: (data.daily_target_minutes as number | null) ?? null,
    submissionType: (data.submission_type as string) ?? 'self_report',
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

export type AssignmentHistoryEntry = {
  id: string;
  changeType: string;
  label: string;
  changedAt: string;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
};

function labelForChange(changeType: string, newData: Record<string, unknown> | null): string {
  const status = (newData?.status as string | undefined) ?? null;
  if (changeType === 'created') return 'Created';
  if (changeType === 'status_changed' && status) {
    return `Status changed to ${status.replace(/_/g, ' ')}`;
  }
  return changeType.replace(/_/g, ' ');
}

/**
 * Last ~10 history entries for an assignment detail timeline (ASG-2), newest
 * first. RLS (assignment_history_select_own) scopes this to the owning
 * teacher/student/admin — a single query, no N+1.
 */
export async function getAssignmentHistory(
  assignmentId: string
): Promise<AssignmentHistoryEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('assignment_history')
    .select('id, change_type, previous_data, new_data, changed_at')
    .eq('assignment_id', assignmentId)
    .order('changed_at', { ascending: false })
    .limit(10);

  if (error) {
    logger.warn('[assignment-detail-queries] history error', {
      error: error.message,
      code: error.code,
    });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    changeType: row.change_type as string,
    label: labelForChange(
      row.change_type as string,
      row.new_data as Record<string, unknown> | null
    ),
    changedAt: row.changed_at as string,
    previousData: row.previous_data,
    newData: row.new_data,
  }));
}

export type PracticeDay = { label: string; minutes: number };

/**
 * Minutes practised on each of the last seven days (oldest first) — the
 * student assignment view's "Practice log" bars. Scoped to the assignment's
 * song when it has one; RLS limits rows to the student's own sessions.
 */
export async function getPracticeWeek(
  studentId: string,
  songId: string | null,
  now: Date = new Date()
): Promise<PracticeDay[]> {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const supabase = await createClient();
  let query = supabase
    .from('practice_sessions')
    .select('duration_minutes, created_at')
    .eq('student_id', studentId)
    .gte('created_at', start.toISOString());
  if (songId) query = query.eq('song_id', songId);
  const { data, error } = await query.limit(500);
  if (error) {
    logger.warn('[assignment-detail-queries] practice week error', { error: error.message });
  }
  const days: PracticeDay[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { label: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2), minutes: 0 };
  });
  for (const row of data ?? []) {
    const idx = Math.floor((Date.parse(row.created_at as string) - start.getTime()) / 86_400_000);
    if (idx >= 0 && idx < 7) days[idx].minutes += (row.duration_minutes as number | null) ?? 0;
  }
  return days;
}
