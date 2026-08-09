import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export type LessonRow = {
  id: string;
  /** Per-teacher sequential number (`lessons.lesson_teacher_number`). */
  lessonNumber: number;
  scheduledAt: string;
  status: string;
  title: string | null;
  durationMinutes: number | null;
  teacherId: string;
  studentId: string;
  studentName: string | null;
  studentEmail: string | null;
  teacherName: string | null;
  teacherEmail: string | null;
  /** Number of songs attached to the lesson via `lesson_songs`. */
  songCount: number;
  /** Per-song `lesson_songs.status`, for the progress dots (unbounded — UI slices). */
  songStatuses: string[];
};

/**
 * Who is looking at the lessons list. Admins see every teacher's lessons;
 * teachers see the ones they teach; students see the ones they attend.
 */
export type LessonViewer = {
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
};

// Maps a raw status (either casing) to its Lessons.status* translation key.
const STATUS_KEYS: Record<string, string> = {
  SCHEDULED: 'statusScheduled',
  IN_PROGRESS: 'statusInProgress',
  COMPLETED: 'statusCompleted',
  CANCELLED: 'statusCancelled',
  scheduled: 'statusScheduled',
  in_progress: 'statusInProgress',
  completed: 'statusCompleted',
  cancelled: 'statusCancelled',
};

const STATUS_COLOURS: Record<string, string> = {
  SCHEDULED: 'var(--info)',
  IN_PROGRESS: 'var(--gold-2)',
  COMPLETED: 'var(--success)',
  CANCELLED: 'var(--ink-4)',
  scheduled: 'var(--info)',
  in_progress: 'var(--gold-2)',
  completed: 'var(--success)',
  cancelled: 'var(--ink-4)',
};

export const lessonStatusLabel = (status: string, t: (key: string) => string, scheduledAt?: string): string => {
  if (status.toLowerCase() === 'scheduled' && scheduledAt && new Date(scheduledAt) < new Date()) {
    // If messages/en.json doesn't have statusOverdue under Lessons, it might throw or return key,
    // so we handle it gracefully. We know 'statusOverdue' exists in Assignments, but might not here.
    return t('statusOverdue') !== 'statusOverdue' ? t('statusOverdue') : 'Overdue';
  }
  const key = STATUS_KEYS[status];
  return key ? t(key) : status;
};
export const lessonStatusColour = (status: string, scheduledAt?: string): string => {
  if (status.toLowerCase() === 'scheduled' && scheduledAt && new Date(scheduledAt) < new Date()) {
    return 'var(--warn)';
  }
  return STATUS_COLOURS[status] ?? 'var(--ink-4)';
};

/** Design-token colours for each `lesson_songs.status`, used by the progress dots. */
const SONG_STATUS_COLOURS: Record<string, string> = {
  to_learn: 'var(--ink-4)',
  started: 'var(--info)',
  remembered: 'var(--warn)',
  with_author: '#7a6aa0',
  mastered: 'var(--success)',
};

export const songStatusColour = (status: string): string =>
  SONG_STATUS_COLOURS[status] ?? 'var(--ink-4)';

/**
 * `lessons.status` is stored upper-case (`SCHEDULED`), but the URL and every UI
 * filter speaks lower-case (`?status=scheduled`). Normalise at the query
 * boundary — passing the raw lower-case value to `.in()` matches nothing.
 */
const toDbStatus = (status: string): string => status.toUpperCase();

/**
 * `newest`/`oldest` are the original values and stay first-class — they are in
 * bookmarks and are what the date column's [asc, desc] pair reuses. The
 * `_asc`/`_desc` pairs back the sortable column headers.
 *
 * Student and teacher are deliberately absent: those names live on a joined
 * profile, so PostgREST cannot order the lesson rows by them without a view.
 * A header that looks sortable but silently keeps the old order is worse than
 * a plain label — same rule as the songs list's aggregate columns.
 */
export type LessonsSortValue =
  | 'newest'
  | 'oldest'
  | 'title_asc'
  | 'title_desc'
  | 'status_asc'
  | 'status_desc';

/** Column + direction each sort value resolves to. */
const SORT_COLUMNS: Record<LessonsSortValue, { column: string; ascending: boolean }> = {
  newest: { column: 'scheduled_at', ascending: false },
  oldest: { column: 'scheduled_at', ascending: true },
  title_asc: { column: 'title', ascending: true },
  title_desc: { column: 'title', ascending: false },
  status_asc: { column: 'status', ascending: true },
  status_desc: { column: 'status', ascending: false },
};

export type LessonsFilters = {
  statuses?: string[];
  sort?: LessonsSortValue;
  /** 1-based page index into the filtered set. */
  page?: number;
  /** Calendar year of `scheduled_at` (UTC) to restrict to. */
  year?: number;
};

const LESSON_SELECT =
  'id, lesson_teacher_number, scheduled_at, status, title, duration_minutes, teacher_id, student_id, student:profiles!lessons_student_id_fkey(id, full_name, email), teacher:profiles!lessons_teacher_id_fkey(id, full_name, email), lesson_songs(status)';

type RawLessonRow = Record<string, unknown> & {
  student?:
    { full_name?: string; email?: string } | { full_name?: string; email?: string }[] | null;
  teacher?:
    { full_name?: string; email?: string } | { full_name?: string; email?: string }[] | null;
  lesson_songs?: { status?: string | null }[] | null;
};

const mapLessonRow = (row: RawLessonRow): LessonRow => {
  const student = Array.isArray(row.student) ? row.student[0] : row.student;
  const teacher = Array.isArray(row.teacher) ? row.teacher[0] : row.teacher;
  const songs = Array.isArray(row.lesson_songs) ? row.lesson_songs : [];
  return {
    id: row.id as string,
    lessonNumber: (row.lesson_teacher_number as number | null) ?? 0,
    scheduledAt: row.scheduled_at as string,
    status: row.status as string,
    title: (row.title as string | null) ?? null,
    durationMinutes: (row.duration_minutes as number | null) ?? null,
    teacherId: row.teacher_id as string,
    studentId: row.student_id as string,
    studentName: student?.full_name ?? null,
    studentEmail: student?.email ?? null,
    teacherName: teacher?.full_name ?? null,
    teacherEmail: teacher?.email ?? null,
    songCount: songs.length,
    songStatuses: songs.map((s) => s?.status ?? 'to_learn'),
  };
};

/** Column a non-admin viewer is scoped to (null = admin, sees every lesson). */
const scopeColumn = (viewer: LessonViewer): 'teacher_id' | 'student_id' | null =>
  viewer.isAdmin ? null : viewer.isTeacher ? 'teacher_id' : 'student_id';

/** Rows per page. The list used to hard-cap here with no way to reach page 2. */
export const LESSONS_PAGE_SIZE = 60;

export async function getRecentLessons(
  userId: string,
  viewer: LessonViewer,
  filters: LessonsFilters = {},
  limit = LESSONS_PAGE_SIZE
): Promise<LessonRow[]> {
  const supabase = await createClient();

  const order = SORT_COLUMNS[filters.sort ?? 'newest'] ?? SORT_COLUMNS.newest;
  let query = supabase
    .from('lessons')
    .select(LESSON_SELECT)
    .is('deleted_at', null)
    .order(order.column, { ascending: order.ascending })
    // Non-date sorts need a stable tiebreak, otherwise rows sharing a title or
    // status can reshuffle between pages and a lesson appears twice or not at all.
    .order('scheduled_at', { ascending: false });

  const ownerColumn = scopeColumn(viewer);
  if (ownerColumn) query = query.eq(ownerColumn, userId);

  if (filters.statuses && filters.statuses.length > 0) {
    query = query.in('status', filters.statuses.map(toDbStatus));
  }

  if (filters.year !== undefined) {
    const start = `${filters.year}-01-01T00:00:00.000Z`;
    const end = `${filters.year + 1}-01-01T00:00:00.000Z`;
    query = query.gte('scheduled_at', start).lt('scheduled_at', end);
  }

  // `page` is 1-based; page 1 reproduces the previous `.limit()` behaviour.
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * limit;
  const { data, error } = await query.range(from, from + limit - 1);

  if (error) {
    logger.warn('[lessons-queries] recent lessons error', {
      error: error.message,
      code: error.code,
    });
    return [];
  }

  return (data ?? []).map((row) => mapLessonRow(row as RawLessonRow));
}

/**
 * Lessons whose `scheduled_at` falls within [startISO, endISO). Role-scoped like
 * getRecentLessons. Used by the calendar month grid, so ordered soonest-first.
 */
export async function getLessonsInRange(
  userId: string,
  viewer: LessonViewer,
  startISO: string,
  endISO: string,
  limit = 500
): Promise<LessonRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from('lessons')
    .select(LESSON_SELECT)
    .is('deleted_at', null)
    .gte('scheduled_at', startISO)
    .lt('scheduled_at', endISO)
    .order('scheduled_at', { ascending: true });

  const ownerColumn = scopeColumn(viewer);
  if (ownerColumn) query = query.eq(ownerColumn, userId);

  const { data, error } = await query.limit(limit);

  if (error) {
    logger.warn('[lessons-queries] lessons in range error', {
      error: error.message,
      code: error.code,
    });
    return [];
  }

  return (data ?? []).map((row) => mapLessonRow(row as RawLessonRow));
}

export type LessonsBreakdown = {
  total: number;
  byStatus: Record<string, number>;
};

/**
 * Status counts for the filter chips and the header total.
 *
 * Deliberately ignores `statuses` and the row limit: a chip has to show its own
 * count while a *different* chip is active, and the list is capped at `limit`
 * while the count is not. Deriving this from the returned page (see
 * `summariseLessons`) reports 0 for every inactive chip and understates the
 * total once the cap is hit.
 */
export async function getLessonsBreakdown(
  userId: string,
  viewer: LessonViewer,
  filters: Pick<LessonsFilters, 'year'> = {}
): Promise<LessonsBreakdown> {
  const supabase = await createClient();

  let query = supabase.from('lessons').select('status').is('deleted_at', null);

  const ownerColumn = scopeColumn(viewer);
  if (ownerColumn) query = query.eq(ownerColumn, userId);

  if (filters.year !== undefined) {
    const start = `${filters.year}-01-01T00:00:00.000Z`;
    const end = `${filters.year + 1}-01-01T00:00:00.000Z`;
    query = query.gte('scheduled_at', start).lt('scheduled_at', end);
  }

  const { data, error } = await query;

  if (error) {
    logger.warn('[lessons-queries] breakdown error', {
      error: error.message,
      code: error.code,
    });
    return { total: 0, byStatus: {} };
  }

  const rows = (data ?? []) as { status: string | null }[];
  const byStatus: Record<string, number> = {};
  for (const row of rows) {
    const key = (row.status ?? '').toLowerCase();
    if (!key) continue;
    byStatus[key] = (byStatus[key] ?? 0) + 1;
  }
  return { total: rows.length, byStatus };
}

export const summariseLessons = (lessons: LessonRow[]): LessonsBreakdown => {
  const byStatus: Record<string, number> = {};
  for (const l of lessons) {
    const key = l.status.toLowerCase();
    byStatus[key] = (byStatus[key] ?? 0) + 1;
  }
  return { total: lessons.length, byStatus };
};
