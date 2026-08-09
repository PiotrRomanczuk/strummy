import enMessages from '@/messages/en.json';
import {
  getLessonsInRange,
  getRecentLessons,
  lessonStatusLabel,
  lessonStatusColour,
  songStatusColour,
  summariseLessons,
  getLessonsBreakdown,
  type LessonRow,
  type LessonViewer,
} from '../lessons-queries';

const TEACHER_VIEWER: LessonViewer = { isAdmin: false, isTeacher: true, isStudent: false };
const STUDENT_VIEWER: LessonViewer = { isAdmin: false, isTeacher: false, isStudent: true };

const mockWarn = jest.fn();
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: (...args: unknown[]) => mockWarn(...args),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

type Chain = {
  select: () => Chain;
  eq: (col: string, val: unknown) => Chain;
  is: (col: string, val: unknown) => Chain;
  order: (col: string, opts: unknown) => Chain;
  in: (col: string, vals: unknown) => Chain;
  gte: (col: string, val: unknown) => Chain;
  lt: (col: string, val: unknown) => Chain;
  limit: (n: number) => unknown;
  /** Paging terminal — `getRecentLessons` uses range(), not limit(). */
  range: (from: number, to: number) => unknown;
  /**
   * `getLessonsBreakdown` awaits the builder itself rather than a terminal
   * like .limit()/.range(). The real PostgREST builder is a thenable, so
   * mirror that here.
   */
  then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => unknown;
};

const mockEq = jest.fn();
const mockIs = jest.fn();
const mockOrder = jest.fn();
const mockIn = jest.fn();
const mockGte = jest.fn();
const mockLt = jest.fn();
const mockLimit = jest.fn();
const mockRange = jest.fn();
/** Result for queries awaited straight off the builder (`getLessonsBreakdown`). */
const mockAwaited = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      from: () => {
        const chain: Chain = {
          select: () => chain,
          eq: (col, val) => {
            mockEq(col, val);
            return chain;
          },
          is: (col, val) => {
            mockIs(col, val);
            return chain;
          },
          order: (col, opts) => {
            mockOrder(col, opts);
            return chain;
          },
          in: (col, vals) => {
            mockIn(col, vals);
            return chain;
          },
          gte: (col, val) => {
            mockGte(col, val);
            return chain;
          },
          lt: (col, val) => {
            mockLt(col, val);
            return chain;
          },
          limit: (n) => mockLimit(n),
          range: (from, to) => mockRange(from, to),
          then: (resolve, reject) => Promise.resolve(mockAwaited()).then(resolve, reject),
        };
        return chain;
      },
    })
  ),
}));

const baseRow = {
  id: 'l1',
  lesson_teacher_number: 7,
  scheduled_at: '2026-07-20T10:00:00Z',
  status: 'SCHEDULED',
  title: 'Intro lesson',
  duration_minutes: 45,
  teacher_id: 't1',
  student_id: 's1',
  lesson_songs: [{ status: 'started' }, { status: 'mastered' }],
};

describe('getRecentLessons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps rows for a teacher with default filters (student as object)', async () => {
    mockRange.mockResolvedValue({
      data: [
        { ...baseRow, student: { id: 's1', full_name: 'Emma', email: 'emma@x.com' } },
        { ...baseRow, id: 'l2', title: null, student: null },
      ],
      error: null,
    });

    const rows = await getRecentLessons('t1', TEACHER_VIEWER);

    expect(mockEq).toHaveBeenCalledWith('teacher_id', 't1');
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    expect(mockOrder).toHaveBeenCalledWith('scheduled_at', { ascending: false });
    expect(mockIn).not.toHaveBeenCalled();
    expect(mockRange).toHaveBeenCalledWith(0, 59);
    expect(mockGte).not.toHaveBeenCalled();
    expect(mockLt).not.toHaveBeenCalled();
    expect(rows).toEqual([
      {
        id: 'l1',
        lessonNumber: 7,
        scheduledAt: '2026-07-20T10:00:00Z',
        status: 'SCHEDULED',
        title: 'Intro lesson',
        durationMinutes: 45,
        teacherId: 't1',
        studentId: 's1',
        studentName: 'Emma',
        studentEmail: 'emma@x.com',
        teacherName: null,
        teacherEmail: null,
        songCount: 2,
        songStatuses: ['started', 'mastered'],
      },
      {
        id: 'l2',
        lessonNumber: 7,
        scheduledAt: '2026-07-20T10:00:00Z',
        status: 'SCHEDULED',
        title: null,
        durationMinutes: 45,
        teacherId: 't1',
        studentId: 's1',
        studentName: null,
        studentEmail: null,
        teacherName: null,
        teacherEmail: null,
        songCount: 2,
        songStatuses: ['started', 'mastered'],
      },
    ]);
  });

  it('aggregates song count/statuses and defaults number + songs when columns are absent', async () => {
    mockRange.mockResolvedValue({
      data: [
        {
          id: 'l9',
          scheduled_at: '2026-07-20T10:00:00Z',
          status: 'SCHEDULED',
          title: 'Bare row',
          teacher_id: 't1',
          student_id: 's1',
          // no lesson_teacher_number, no lesson_songs, no joined profiles
        },
      ],
      error: null,
    });

    const rows = await getRecentLessons('t1', TEACHER_VIEWER);

    expect(rows[0].lessonNumber).toBe(0);
    expect(rows[0].songCount).toBe(0);
    expect(rows[0].songStatuses).toEqual([]);
  });

  it('applies a year range filter as gte/lt UTC boundaries', async () => {
    mockRange.mockResolvedValue({ data: [], error: null });

    await getRecentLessons('t1', TEACHER_VIEWER, { year: 2025 });

    expect(mockGte).toHaveBeenCalledWith('scheduled_at', '2025-01-01T00:00:00.000Z');
    expect(mockLt).toHaveBeenCalledWith('scheduled_at', '2026-01-01T00:00:00.000Z');
  });

  it('filters by student, oldest sort, and statuses (student as array)', async () => {
    mockRange.mockResolvedValue({
      data: [
        { ...baseRow, student: [{ id: 's1', full_name: 'Liam', email: 'liam@x.com' }] },
        { ...baseRow, id: 'l3', student: [] },
      ],
      error: null,
    });

    const rows = await getRecentLessons(
      's1',
      STUDENT_VIEWER,
      { statuses: ['SCHEDULED', 'COMPLETED'], sort: 'oldest' },
      10
    );

    expect(mockEq).toHaveBeenCalledWith('student_id', 's1');
    expect(mockOrder).toHaveBeenCalledWith('scheduled_at', { ascending: true });
    expect(mockIn).toHaveBeenCalledWith('status', ['SCHEDULED', 'COMPLETED']);
    expect(mockRange).toHaveBeenCalledWith(0, 9);
    expect(rows[0].studentName).toBe('Liam');
    expect(rows[1].studentName).toBeNull();
    expect(rows[1].studentEmail).toBeNull();
  });

  it('does not apply the status filter for an empty statuses array', async () => {
    mockRange.mockResolvedValue({ data: [], error: null });

    const rows = await getRecentLessons('t1', TEACHER_VIEWER, { statuses: [] });

    expect(mockIn).not.toHaveBeenCalled();
    expect(rows).toEqual([]);
  });

  it('warns and returns [] on query error', async () => {
    mockRange.mockResolvedValue({ data: null, error: { message: 'boom', code: '42' } });

    const rows = await getRecentLessons('t1', TEACHER_VIEWER);

    expect(mockWarn).toHaveBeenCalledWith('[lessons-queries] recent lessons error', {
      error: 'boom',
      code: '42',
    });
    expect(rows).toEqual([]);
  });

  it('offsets the range by page (page 2 starts after the first page)', async () => {
    mockRange.mockResolvedValue({ data: [], error: null });

    await getRecentLessons('t1', TEACHER_VIEWER, { page: 2 });

    expect(mockRange).toHaveBeenCalledWith(60, 119);
  });

  it('treats a missing or invalid page as page 1', async () => {
    mockRange.mockResolvedValue({ data: [], error: null });

    await getRecentLessons('t1', TEACHER_VIEWER, { page: 0 });

    expect(mockRange).toHaveBeenCalledWith(0, 59);
  });

  it('upper-cases lower-case status filters to match the DB column', async () => {
    mockRange.mockResolvedValue({ data: [], error: null });

    await getRecentLessons('t1', TEACHER_VIEWER, { statuses: ['scheduled', 'completed'] });

    expect(mockIn).toHaveBeenCalledWith('status', ['SCHEDULED', 'COMPLETED']);
  });

  it('returns [] when data is null without error', async () => {
    mockRange.mockResolvedValue({ data: null, error: null });

    const rows = await getRecentLessons('t1', TEACHER_VIEWER);

    expect(mockWarn).not.toHaveBeenCalled();
    expect(rows).toEqual([]);
  });
});

// Backs the calendar month grid. Same role scoping as getRecentLessons, but a
// half-open [start, end) window and soonest-first ordering.
describe('getRecentLessons — sort resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRange.mockResolvedValue({ data: [], error: null });
  });

  it.each([
    ['title_asc', 'title', true],
    ['title_desc', 'title', false],
    ['status_asc', 'status', true],
    ['status_desc', 'status', false],
  ] as const)('orders by %s', async (sort, column, ascending) => {
    await getRecentLessons('t1', TEACHER_VIEWER, { sort });
    expect(mockOrder).toHaveBeenCalledWith(column, { ascending });
  });

  it('tiebreaks every non-date sort on scheduled_at', async () => {
    // Rows sharing a title have no total order otherwise, so Postgres may
    // return them differently per page — a lesson could appear on two pages or
    // on neither.
    await getRecentLessons('t1', TEACHER_VIEWER, { sort: 'title_asc' });
    expect(mockOrder).toHaveBeenCalledWith('scheduled_at', { ascending: false });
  });

  it('falls back to newest when the sort value is not one it knows', async () => {
    // Unreachable through the route, which whitelists the param — but this is
    // exported and an API caller can hand it an unvalidated string. The guard
    // is what keeps that from reaching Postgres as `.order(undefined)`.
    await getRecentLessons('t1', TEACHER_VIEWER, {
      sort: 'nonsense' as unknown as NonNullable<Parameters<typeof getRecentLessons>[2]>['sort'],
    });
    expect(mockOrder).toHaveBeenCalledWith('scheduled_at', { ascending: false });
  });
});

describe('getLessonsInRange', () => {
  const START = '2026-07-01T00:00:00Z';
  const END = '2026-08-01T00:00:00Z';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('windows the query and orders soonest-first for a teacher', async () => {
    mockLimit.mockResolvedValue({
      data: [{ ...baseRow, student: { id: 's1', full_name: 'Emma', email: 'emma@x.com' } }],
      error: null,
    });

    const rows = await getLessonsInRange('t1', TEACHER_VIEWER, START, END);

    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    expect(mockGte).toHaveBeenCalledWith('scheduled_at', START);
    expect(mockLt).toHaveBeenCalledWith('scheduled_at', END);
    expect(mockOrder).toHaveBeenCalledWith('scheduled_at', { ascending: true });
    expect(mockEq).toHaveBeenCalledWith('teacher_id', 't1');
    expect(mockLimit).toHaveBeenCalledWith(500);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 'l1', lessonNumber: 7, studentName: 'Emma' });
  });

  it('scopes a student to their own lessons', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });
    await getLessonsInRange('s1', STUDENT_VIEWER, START, END);
    expect(mockEq).toHaveBeenCalledWith('student_id', 's1');
  });

  it('applies no owner filter for an admin', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });
    await getLessonsInRange(
      'a1',
      { isAdmin: true, isTeacher: false, isStudent: false },
      START,
      END
    );
    expect(mockEq).not.toHaveBeenCalled();
  });

  it('honours an explicit limit', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });
    await getLessonsInRange('t1', TEACHER_VIEWER, START, END, 10);
    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it('returns [] and warns on a query error', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'boom', code: '42P01' } });

    expect(await getLessonsInRange('t1', TEACHER_VIEWER, START, END)).toEqual([]);
    expect(mockWarn).toHaveBeenCalledWith('[lessons-queries] lessons in range error', {
      error: 'boom',
      code: '42P01',
    });
  });

  it('returns [] without warning when the payload is null', async () => {
    mockLimit.mockResolvedValue({ data: null, error: null });

    expect(await getLessonsInRange('t1', TEACHER_VIEWER, START, END)).toEqual([]);
    expect(mockWarn).not.toHaveBeenCalled();
  });

  // PostgREST returns an embedded join as an object or a single-element array
  // depending on the relationship it infers, so the mapper handles both. The
  // teacher side of that had never been exercised, nor the null fallbacks.
  it('unwraps a teacher embedded as an array and falls back on missing fields', async () => {
    mockLimit.mockResolvedValue({
      data: [
        {
          ...baseRow,
          student: null,
          teacher: [{ full_name: 'Sarah', email: 'sarah@x.com' }],
          lesson_songs: [{ status: null }, {}],
        },
        {
          ...baseRow,
          id: 'l2',
          lesson_teacher_number: null,
          duration_minutes: null,
          student: null,
          teacher: null,
          lesson_songs: null,
        },
      ],
      error: null,
    });

    const rows = await getLessonsInRange('t1', TEACHER_VIEWER, START, END);

    expect(rows[0]).toMatchObject({
      teacherName: 'Sarah',
      teacherEmail: 'sarah@x.com',
      studentName: null,
      songCount: 2,
      // a song row with no status reads as the first rung of the ladder
      songStatuses: ['to_learn', 'to_learn'],
    });
    expect(rows[1]).toMatchObject({
      lessonNumber: 0,
      durationMinutes: null,
      teacherName: null,
      teacherEmail: null,
      songCount: 0,
      songStatuses: [],
    });
  });
});

describe('lessonStatusLabel', () => {
  const t = (key: string) => enMessages.Lessons[key as keyof typeof enMessages.Lessons];

  it('maps known statuses (both cases)', () => {
    expect(lessonStatusLabel('SCHEDULED', t)).toBe('Scheduled');
    expect(lessonStatusLabel('in_progress', t)).toBe('In progress');
  });

  it('falls back to the raw status for unknown values', () => {
    expect(lessonStatusLabel('MYSTERY', t)).toBe('MYSTERY');
  });

  it('uses the statusOverdue translation for a past-dated scheduled lesson', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(lessonStatusLabel('scheduled', t, past)).toBe('Overdue');
  });

  it('falls back to the literal "Overdue" when the translation key is missing', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    const tMissing = (key: string) => key; // simulates messages/en.json lacking statusOverdue
    expect(lessonStatusLabel('scheduled', tMissing, past)).toBe('Overdue');
  });
});

describe('lessonStatusColour', () => {
  it('maps known statuses (both cases)', () => {
    expect(lessonStatusColour('COMPLETED')).toBe('var(--success)');
    expect(lessonStatusColour('cancelled')).toBe('var(--ink-4)');
  });

  it('falls back to the muted colour for unknown values', () => {
    expect(lessonStatusColour('MYSTERY')).toBe('var(--ink-4)');
  });

  /**
   * "Scheduled but the time has passed" is the overdue signal the lessons list
   * and its phone trailing block rely on. It only fires for that exact pairing,
   * so each half needs its own case.
   */
  it('warns for a scheduled lesson whose time has passed', () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(lessonStatusColour('SCHEDULED', past)).toBe('var(--warn)');
    expect(lessonStatusColour('scheduled', past)).toBe('var(--warn)');
  });

  it('leaves a future scheduled lesson on its normal colour', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(lessonStatusColour('SCHEDULED', future)).not.toBe('var(--warn)');
  });

  it('does not warn for a non-scheduled status in the past', () => {
    // A completed lesson in the past is the normal case, not an alert.
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(lessonStatusColour('COMPLETED', past)).toBe('var(--success)');
  });

  it('does not warn when no time is supplied', () => {
    expect(lessonStatusColour('SCHEDULED')).not.toBe('var(--warn)');
  });
});

describe('songStatusColour', () => {
  it('maps each lesson_songs.status to its token', () => {
    expect(songStatusColour('to_learn')).toBe('var(--ink-4)');
    expect(songStatusColour('started')).toBe('var(--info)');
    expect(songStatusColour('remembered')).toBe('var(--warn)');
    expect(songStatusColour('with_author')).toBe('#7a6aa0');
    expect(songStatusColour('mastered')).toBe('var(--success)');
  });

  it('falls back to the muted colour for unknown values', () => {
    expect(songStatusColour('???')).toBe('var(--ink-4)');
  });
});

describe('summariseLessons', () => {
  const makeLesson = (id: string, status: string): LessonRow => ({
    id,
    lessonNumber: 1,
    scheduledAt: '2026-07-20T10:00:00Z',
    status,
    title: null,
    durationMinutes: null,
    teacherId: 't1',
    studentId: 's1',
    studentName: null,
    studentEmail: null,
    teacherName: null,
    teacherEmail: null,
    songCount: 0,
    songStatuses: [],
  });

  it('returns zero totals for an empty list', () => {
    expect(summariseLessons([])).toEqual({ total: 0, byStatus: {} });
  });

  it('counts statuses case-insensitively, including repeats', () => {
    const result = summariseLessons([
      makeLesson('l1', 'SCHEDULED'),
      makeLesson('l2', 'scheduled'),
      makeLesson('l3', 'COMPLETED'),
    ]);
    expect(result).toEqual({ total: 3, byStatus: { scheduled: 2, completed: 1 } });
  });
});

describe('getLessonsBreakdown', () => {
  const ADMIN_VIEWER: LessonViewer = { isAdmin: true, isTeacher: false, isStudent: false };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('counts statuses case-insensitively and scopes a teacher to their own lessons', async () => {
    mockAwaited.mockResolvedValue({
      data: [{ status: 'SCHEDULED' }, { status: 'scheduled' }, { status: 'COMPLETED' }],
      error: null,
    });

    const result = await getLessonsBreakdown('t1', TEACHER_VIEWER);

    expect(mockEq).toHaveBeenCalledWith('teacher_id', 't1');
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    expect(result).toEqual({ total: 3, byStatus: { scheduled: 2, completed: 1 } });
  });

  it('scopes a student to the lessons they attend', async () => {
    mockAwaited.mockResolvedValue({ data: [{ status: 'COMPLETED' }], error: null });

    const result = await getLessonsBreakdown('s1', STUDENT_VIEWER);

    expect(mockEq).toHaveBeenCalledWith('student_id', 's1');
    expect(result).toEqual({ total: 1, byStatus: { completed: 1 } });
  });

  it('does not scope an admin to an owner column', async () => {
    mockAwaited.mockResolvedValue({ data: [{ status: 'SCHEDULED' }], error: null });

    await getLessonsBreakdown('a1', ADMIN_VIEWER);

    expect(mockEq).not.toHaveBeenCalled();
  });

  it('bounds the query to the calendar year when a year filter is given', async () => {
    mockAwaited.mockResolvedValue({ data: [], error: null });

    await getLessonsBreakdown('t1', TEACHER_VIEWER, { year: 2026 });

    expect(mockGte).toHaveBeenCalledWith('scheduled_at', '2026-01-01T00:00:00.000Z');
    expect(mockLt).toHaveBeenCalledWith('scheduled_at', '2027-01-01T00:00:00.000Z');
  });

  it('skips rows whose status is null or empty but still counts them in the total', async () => {
    mockAwaited.mockResolvedValue({
      data: [{ status: 'SCHEDULED' }, { status: null }, { status: '' }],
      error: null,
    });

    // The total is the row count — the chips only omit the unlabelled rows.
    expect(await getLessonsBreakdown('t1', TEACHER_VIEWER)).toEqual({
      total: 3,
      byStatus: { scheduled: 1 },
    });
  });

  it('treats a null data payload as an empty breakdown', async () => {
    mockAwaited.mockResolvedValue({ data: null, error: null });

    expect(await getLessonsBreakdown('t1', TEACHER_VIEWER)).toEqual({ total: 0, byStatus: {} });
  });

  it('returns an empty breakdown and warns when the query errors', async () => {
    mockAwaited.mockResolvedValue({ data: null, error: { message: 'boom', code: 'ERR' } });

    expect(await getLessonsBreakdown('t1', TEACHER_VIEWER)).toEqual({ total: 0, byStatus: {} });
    expect(mockWarn).toHaveBeenCalledWith('[lessons-queries] breakdown error', {
      error: 'boom',
      code: 'ERR',
    });
  });
});
