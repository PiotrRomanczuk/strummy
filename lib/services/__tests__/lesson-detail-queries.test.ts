import {
  getLessonAssignments,
  getLessonContinuity,
  getLessonDetail,
  getLessonHistory,
} from '../lesson-detail-queries';

const mockWarn = jest.fn();
jest.mock('@/lib/logger', () => ({
  logger: {
    warn: (...args: unknown[]) => mockWarn(...args),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const mockFrom = jest.fn();
const mockEq = jest.fn();
const mockNeq = jest.fn();
const mockIs = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockSingle = jest.fn();

/**
 * Results for queries awaited straight off the builder. The three functions in
 * this module end on different methods — .single(), .order() and .limit() — so
 * the mock mirrors the real PostgREST builder, which is a thenable that
 * resolves whenever it is awaited regardless of the trailing call.
 */
const mockChainResults: { data: unknown; error: unknown }[] = [];

type Chain = {
  select: (...args: unknown[]) => Chain;
  eq: (col: string, val: unknown) => Chain;
  neq: (col: string, val: unknown) => Chain;
  is: (col: string, val: unknown) => Chain;
  order: (col: string, opts?: unknown) => Chain;
  limit: (n: number) => Chain;
  single: () => unknown;
  then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => unknown;
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      from: (table: string) => {
        mockFrom(table);
        const chain: Chain = {
          select: () => chain,
          eq: (col, val) => {
            mockEq(col, val);
            return chain;
          },
          neq: (col, val) => {
            mockNeq(col, val);
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
          limit: (n) => {
            mockLimit(n);
            return chain;
          },
          single: () => mockSingle(),
          then: (resolve, reject) =>
            Promise.resolve(mockChainResults.shift() ?? { data: null, error: null }).then(
              resolve,
              reject
            ),
        };
        return chain;
      },
    })
  ),
}));

const baseLesson = {
  id: 'l1',
  scheduled_at: '2026-07-20T10:00:00Z',
  status: 'SCHEDULED',
  title: 'Fingerpicking basics',
  notes: 'Bring the capo',
  teacher_id: 't1',
  student_id: 's1',
};

describe('getLessonDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChainResults.length = 0;
  });

  it('maps a full lesson with joins as arrays and mixed songs', async () => {
    mockSingle.mockResolvedValue({
      data: {
        ...baseLesson,
        lesson_teacher_number: 7,
        duration_minutes: 45,
        format: 'in_person',
        teacher: [{ full_name: 'Sarah' }],
        student: [{ full_name: 'Emma', email: 'emma@x.com' }],
        lesson_songs: [
          {
            song_id: 'sg1',
            status: 'started',
            songs: { title: 'Song A', author: 'AC/DC', key: 'A' },
          },
          { song_id: 'sg2', status: null, songs: [{ title: 'Song B', author: null, key: null }] },
          { song_id: 'sg3', status: 'mastered', songs: null },
          { song_id: 'sg4', status: 'mastered', songs: [] },
        ],
      },
      error: null,
    });

    const detail = await getLessonDetail('l1');

    expect(mockEq).toHaveBeenCalledWith('id', 'l1');
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    expect(detail).toEqual({
      id: 'l1',
      scheduledAt: '2026-07-20T10:00:00Z',
      status: 'SCHEDULED',
      title: 'Fingerpicking basics',
      notes: 'Bring the capo',
      durationMinutes: 45,
      format: 'in_person',
      teacherId: 't1',
      teacherName: 'Sarah',
      studentId: 's1',
      studentName: 'Emma',
      studentEmail: 'emma@x.com',
      lessonTeacherNumber: 7,
      songs: [
        { songId: 'sg1', title: 'Song A', author: 'AC/DC', key: 'A', status: 'started' },
        { songId: 'sg2', title: 'Song B', author: null, key: null, status: null },
      ],
    });
  });

  it('maps a sparse lesson with null joins and no songs', async () => {
    mockSingle.mockResolvedValue({
      data: {
        ...baseLesson,
        title: null,
        notes: null,
        teacher: null,
        student: null,
        lesson_songs: null,
      },
      error: null,
    });

    const detail = await getLessonDetail('l1');

    expect(detail).toEqual({
      id: 'l1',
      scheduledAt: '2026-07-20T10:00:00Z',
      status: 'SCHEDULED',
      title: null,
      notes: null,
      durationMinutes: null,
      format: null,
      teacherId: 't1',
      teacherName: null,
      studentId: 's1',
      studentName: null,
      studentEmail: null,
      lessonTeacherNumber: null,
      songs: [],
    });
  });

  it('returns null without warning for a not-found error (PGRST116)', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'no rows', code: 'PGRST116' } });

    expect(await getLessonDetail('missing')).toBeNull();
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('warns and returns null for other errors', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'boom', code: '500' } });

    expect(await getLessonDetail('l1')).toBeNull();
    expect(mockWarn).toHaveBeenCalledWith('[lesson-detail-queries] error', {
      error: 'boom',
      code: '500',
    });
  });
});

/** Homework attached to a lesson — the detail page's Homework card. */
describe('getLessonAssignments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChainResults.length = 0;
  });

  it('maps assignments and filters to the lesson, soonest due first', async () => {
    mockChainResults.push({
      data: [
        { id: 'a1', title: 'Practice bar chords', due_date: '2026-08-01', status: 'in_progress' },
        { id: 'a2', title: 'Learn the bridge', due_date: null, status: null },
      ],
      error: null,
    });

    const rows = await getLessonAssignments('l1');

    expect(mockFrom).toHaveBeenCalledWith('assignments');
    expect(mockEq).toHaveBeenCalledWith('lesson_id', 'l1');
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    expect(mockOrder).toHaveBeenCalledWith('due_date', { ascending: true, nullsFirst: false });
    expect(rows).toEqual([
      { id: 'a1', title: 'Practice bar chords', dueDate: '2026-08-01', status: 'in_progress' },
      // an assignment with no persisted status reads as not started
      { id: 'a2', title: 'Learn the bridge', dueDate: null, status: 'not_started' },
    ]);
  });

  it('returns [] and warns on a query error', async () => {
    mockChainResults.push({ data: null, error: { message: 'boom', code: '42P01' } });

    expect(await getLessonAssignments('l1')).toEqual([]);
    expect(mockWarn).toHaveBeenCalledWith('[lesson-detail-queries] assignments error', {
      error: 'boom',
      code: '42P01',
    });
  });

  it('returns [] without warning when the payload is null', async () => {
    mockChainResults.push({ data: null, error: null });

    expect(await getLessonAssignments('l1')).toEqual([]);
    expect(mockWarn).not.toHaveBeenCalled();
  });
});

/** Previous lessons with the same student — the detail page's Continuity card. */
describe('getLessonContinuity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChainResults.length = 0;
  });

  it('maps recent lessons, excluding the current one', async () => {
    mockChainResults.push({
      data: [
        {
          id: 'l0',
          lesson_teacher_number: 6,
          scheduled_at: '2026-07-13T10:00:00Z',
          title: 'Last week',
          notes: 'Worked on the intro',
          status: 'COMPLETED',
        },
        {
          id: 'l-2',
          lesson_teacher_number: null,
          scheduled_at: '2026-07-06T10:00:00Z',
          title: null,
          notes: null,
          status: null,
        },
      ],
      error: null,
    });

    const rows = await getLessonContinuity('s1', 'l1');

    expect(mockFrom).toHaveBeenCalledWith('lessons');
    expect(mockEq).toHaveBeenCalledWith('student_id', 's1');
    expect(mockNeq).toHaveBeenCalledWith('id', 'l1');
    expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
    expect(mockOrder).toHaveBeenCalledWith('scheduled_at', { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(3);
    expect(rows).toEqual([
      {
        id: 'l0',
        lessonTeacherNumber: 6,
        scheduledAt: '2026-07-13T10:00:00Z',
        title: 'Last week',
        notes: 'Worked on the intro',
        status: 'COMPLETED',
      },
      {
        id: 'l-2',
        lessonTeacherNumber: null,
        scheduledAt: '2026-07-06T10:00:00Z',
        title: null,
        notes: null,
        status: 'SCHEDULED',
      },
    ]);
  });

  it('honours an explicit limit', async () => {
    mockChainResults.push({ data: [], error: null });
    await getLessonContinuity('s1', 'l1', 10);
    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it('returns [] and warns on a query error', async () => {
    mockChainResults.push({ data: null, error: { message: 'nope', code: '500' } });

    expect(await getLessonContinuity('s1', 'l1')).toEqual([]);
    expect(mockWarn).toHaveBeenCalledWith('[lesson-detail-queries] continuity error', {
      error: 'nope',
      code: '500',
    });
  });

  it('returns [] without warning when the payload is null', async () => {
    mockChainResults.push({ data: null, error: null });

    expect(await getLessonContinuity('s1', 'l1')).toEqual([]);
    expect(mockWarn).not.toHaveBeenCalled();
  });
});

describe('getLessonHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockChainResults.length = 0;
  });

  it('labels a created entry and a status change, normalizing underscores', async () => {
    mockChainResults.push({
      data: [
        {
          id: 'h1',
          change_type: 'created',
          previous_data: null,
          new_data: { status: 'SCHEDULED' },
          changed_at: '2026-07-20T10:00:00Z',
        },
        {
          id: 'h2',
          change_type: 'status_changed',
          previous_data: { status: 'SCHEDULED' },
          new_data: { status: 'in_progress' },
          changed_at: '2026-07-21T10:00:00Z',
        },
      ],
      error: null,
    });

    const rows = await getLessonHistory('l1');

    expect(mockFrom).toHaveBeenCalledWith('lesson_history');
    expect(mockEq).toHaveBeenCalledWith('lesson_id', 'l1');
    expect(mockOrder).toHaveBeenCalledWith('changed_at', { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(10);
    expect(rows).toEqual([
      {
        id: 'h1',
        changeType: 'created',
        label: 'Created',
        changedAt: '2026-07-20T10:00:00Z',
        previousData: null,
        newData: { status: 'SCHEDULED' },
      },
      {
        id: 'h2',
        changeType: 'status_changed',
        label: 'Status changed to in progress',
        changedAt: '2026-07-21T10:00:00Z',
        previousData: { status: 'SCHEDULED' },
        newData: { status: 'in_progress' },
      },
    ]);
  });

  it('falls back to a humanized change type when there is no status on the new data', async () => {
    mockChainResults.push({
      data: [
        {
          id: 'h3',
          change_type: 'notes_updated',
          previous_data: null,
          new_data: null,
          changed_at: '2026-07-22T10:00:00Z',
        },
      ],
      error: null,
    });

    const rows = await getLessonHistory('l1');

    expect(rows[0].label).toBe('notes updated');
  });

  it('returns [] and warns on a query error', async () => {
    mockChainResults.push({ data: null, error: { message: 'nope', code: '500' } });

    expect(await getLessonHistory('l1')).toEqual([]);
    expect(mockWarn).toHaveBeenCalledWith('[lesson-detail-queries] history error', {
      error: 'nope',
      code: '500',
    });
  });

  it('returns [] without warning when the payload is null', async () => {
    mockChainResults.push({ data: null, error: null });

    expect(await getLessonHistory('l1')).toEqual([]);
    expect(mockWarn).not.toHaveBeenCalled();
  });
});
