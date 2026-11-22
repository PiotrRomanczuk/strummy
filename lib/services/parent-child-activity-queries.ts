import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * What a parent sees of their child's work beyond the next lessons: homework
 * and the lessons that already happened. Read with the parent's session —
 * `assignments_select_parent` and `lessons_select_parent` scope both to the
 * parent's own children. Only display fields are selected: no teacher notes
 * on the assignment, no lesson notes (the dashboard shows the latest note
 * separately).
 */

export type ParentAssignmentStatus =
  'not_started' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

export type ParentAssignment = {
  id: string;
  title: string | null;
  status: ParentAssignmentStatus;
  dueDate: string | null;
};

export type ParentPastLesson = {
  id: string;
  scheduledAt: string;
  title: string | null;
  status: string;
};

const OPEN_STATUSES: ParentAssignmentStatus[] = ['not_started', 'in_progress', 'overdue'];
const ASSIGNMENT_LIMIT = 8;
const PAST_LESSON_LIMIT = 5;

/** Today in Warsaw as `YYYY-MM-DD` — due dates are Warsaw calendar days. */
const warsawToday = (now: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);

/**
 * Nothing flips an assignment to `overdue` in the database, so open homework
 * past its due date still says "not started". A parent needs to see it is late.
 */
const displayStatus = (
  status: ParentAssignmentStatus,
  dueDate: string | null,
  today: string
): ParentAssignmentStatus =>
  (status === 'not_started' || status === 'in_progress') && dueDate && dueDate.slice(0, 10) < today
    ? 'overdue'
    : status;

/**
 * One query per group, each with its own small limit, so a long history can
 * never push the current open homework out of the window.
 */
async function fetchAssignmentRows(childId: string, isOpen: boolean) {
  const supabase = await createClient();
  const base = supabase
    .from('assignments')
    .select('id, title, status, due_date')
    .eq('student_id', childId)
    .is('deleted_at', null);
  const scoped = isOpen ? base.in('status', OPEN_STATUSES) : base.eq('status', 'completed');
  return scoped.order('due_date', { ascending: isOpen, nullsFirst: false }).limit(ASSIGNMENT_LIMIT);
}

/** Open homework first (soonest due first), then the most recently finished. */
export async function getChildAssignments(
  childId: string,
  now: Date = new Date()
): Promise<ParentAssignment[]> {
  const [open, done] = await Promise.all([
    fetchAssignmentRows(childId, true),
    fetchAssignmentRows(childId, false),
  ]);
  const failure = open.error ?? done.error;
  if (failure) {
    logger.warn('[parent-child-activity] assignments error', { error: failure.message });
    return [];
  }

  const today = warsawToday(now);
  const rows = [...(open.data ?? []), ...(done.data ?? [])].map((row) => {
    const dueDate = (row.due_date as string | null) ?? null;
    return {
      id: row.id as string,
      title: (row.title as string | null) ?? null,
      status: displayStatus(row.status as ParentAssignmentStatus, dueDate, today),
      dueDate,
    };
  });
  return rows.slice(0, ASSIGNMENT_LIMIT);
}

/** The latest lessons that already took place (or were due to), newest first. */
export async function getChildPastLessons(childId: string, now: Date): Promise<ParentPastLesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('lessons')
    .select('id, scheduled_at, title, status')
    .eq('student_id', childId)
    .is('deleted_at', null)
    .lt('scheduled_at', now.toISOString())
    .order('scheduled_at', { ascending: false })
    .limit(PAST_LESSON_LIMIT);
  if (error) {
    logger.warn('[parent-child-activity] past lessons error', { error: error.message });
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    scheduledAt: row.scheduled_at as string,
    title: (row.title as string | null) ?? null,
    status: row.status as string,
  }));
}
