import {
  getAssignmentDetail,
  getAssignmentHistory,
  getPracticeWeek,
} from '../assignment-detail-queries';
import { logger } from '@/lib/logger';

const mockSingle = jest.fn();
const mockLimit = jest.fn();
const mockPracticeLimit = jest.fn();
const mockEq = jest.fn();
const mockGte = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      from: () => ({
        select: () => ({
          eq: (col: string, val: unknown) => {
            mockEq(col, val);
            // getPracticeWeek: .eq(student).gte(created_at)[.eq(song)].limit()
            const practice = {
              eq: (c: string, v: unknown) => {
                mockEq(c, v);
                return practice;
              },
              limit: () => mockPracticeLimit(),
            };
            return {
              is: () => ({
                single: () => mockSingle(),
              }),
              order: () => ({
                limit: () => mockLimit(),
              }),
              gte: (c: string, v: unknown) => {
                mockGte(c, v);
                return practice;
              },
            };
          },
        }),
      }),
    })
  ),
}));

jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

describe('getAssignmentDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps a full row with embedded objects correctly', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'a1',
        title: 'Learn C Major',
        description: 'Practice the scale',
        status: 'in_progress',
        due_date: '2026-07-20T00:00:00Z',
        teacher_id: 't1',
        student_id: 's1',
        checklist: [{ id: '1', text: 'Play C', done: true }],
        created_at: '2026-07-10T00:00:00Z',
        updated_at: '2026-07-15T00:00:00Z',
        student: { full_name: 'Student Bob', email: 'bob@example.com' },
        teacher: { full_name: 'Teacher Alice' },
        song: { id: 'song1', title: 'C Major Scale', author: 'Trad', chords: 'C F G' },
        lesson: { id: 'lesson1', scheduled_at: '2026-07-19T00:00:00Z' },
      },
      error: null,
    });

    const result = await getAssignmentDetail('a1');
    expect(result).toEqual({
      id: 'a1',
      title: 'Learn C Major',
      description: 'Practice the scale',
      status: 'in_progress',
      dueDate: '2026-07-20T00:00:00Z',
      teacherId: 't1',
      studentId: 's1',
      studentName: 'Student Bob',
      studentEmail: 'bob@example.com',
      teacherName: 'Teacher Alice',
      song: { id: 'song1', title: 'C Major Scale', author: 'Trad', chords: 'C F G' },
      lesson: { id: 'lesson1', scheduledAt: '2026-07-19T00:00:00Z' },
      checklist: [{ id: '1', text: 'Play C', done: true }],
      chordDrill: null,
      chordDrillResult: null,
      dailyTargetMinutes: null,
      submissionType: 'self_report',
      createdAt: '2026-07-10T00:00:00Z',
      updatedAt: '2026-07-15T00:00:00Z',
    });
  });

  it('maps the daily practice target and submission type when present', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'a5',
        title: 'Timed drill',
        description: null,
        status: 'not_started',
        due_date: null,
        teacher_id: 't1',
        student_id: 's1',
        checklist: null,
        daily_target_minutes: 15,
        submission_type: 'audio',
        created_at: '2026-07-10T00:00:00Z',
        updated_at: '2026-07-10T00:00:00Z',
        student: null,
        teacher: null,
        song: null,
        lesson: null,
      },
      error: null,
    });

    const result = await getAssignmentDetail('a5');
    expect(result?.dailyTargetMinutes).toBe(15);
    expect(result?.submissionType).toBe('audio');
  });

  it('maps a chord drill and its result (ASG-4)', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'a4',
        title: 'Chord drill',
        description: null,
        status: 'completed',
        due_date: null,
        teacher_id: 't1',
        student_id: 's1',
        checklist: null,
        chord_drill: { chord_ids: ['C-open', 'Am-open'] },
        chord_drill_result: { score: 2, total: 2, completed_at: '2026-07-22T10:00:00Z' },
        created_at: '2026-07-10T00:00:00Z',
        updated_at: '2026-07-22T10:00:00Z',
        student: null,
        teacher: null,
        song: null,
        lesson: null,
      },
      error: null,
    });

    const result = await getAssignmentDetail('a4');
    expect(result?.chordDrill).toEqual({ chord_ids: ['C-open', 'Am-open'] });
    expect(result?.chordDrillResult).toEqual({
      score: 2,
      total: 2,
      completed_at: '2026-07-22T10:00:00Z',
    });
  });

  it('handles array embeddings (PostgREST idiosyncrasy)', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'a2',
        title: 'Test',
        description: null,
        status: 'todo',
        due_date: null,
        teacher_id: 't1',
        student_id: 's1',
        checklist: null,
        created_at: '2026-07-10T00:00:00Z',
        updated_at: '2026-07-10T00:00:00Z',
        student: [{ full_name: 'Student Bob', email: null }],
        teacher: [{ full_name: null }],
        song: [],
        lesson: null,
      },
      error: null,
    });

    const result = await getAssignmentDetail('a2');
    expect(result?.studentName).toBe('Student Bob');
    expect(result?.teacherName).toBeNull();
    expect(result?.song).toBeNull();
    expect(result?.lesson).toBeNull();
    expect(result?.checklist).toEqual([]);
  });

  it('nulls out a missing student and unset song author / lesson schedule', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'a3',
        title: 'Test',
        description: null,
        status: 'todo',
        due_date: null,
        teacher_id: 't1',
        student_id: 's1',
        checklist: null,
        created_at: '2026-07-10T00:00:00Z',
        updated_at: '2026-07-10T00:00:00Z',
        student: null,
        teacher: { full_name: 'Teacher Alice' },
        song: { id: 'song1', title: 'Untitled Riff', author: null },
        lesson: { id: 'lesson1', scheduled_at: null },
      },
      error: null,
    });

    const result = await getAssignmentDetail('a3');
    expect(result?.studentName).toBeNull();
    expect(result?.studentEmail).toBeNull();
    expect(result?.song).toEqual({
      id: 'song1',
      title: 'Untitled Riff',
      author: null,
      chords: null,
    });
    expect(result?.lesson).toEqual({ id: 'lesson1', scheduledAt: null });
  });

  it('returns null on error and logs if not PGRST116', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: 'OTHER', message: 'boom' } });
    expect(await getAssignmentDetail('a1')).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith('[assignment-detail-queries] error', {
      error: 'boom',
      code: 'OTHER',
    });
  });

  it('returns null silently on PGRST116 (not found)', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'not found' } });
    expect(await getAssignmentDetail('a1')).toBeNull();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe('getAssignmentHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('maps history rows and formats labels', async () => {
    mockLimit.mockResolvedValue({
      data: [
        { id: 'h1', change_type: 'created', new_data: null, changed_at: '2026-07-10T00:00:00Z' },
        {
          id: 'h2',
          change_type: 'status_changed',
          new_data: { status: 'in_progress' },
          changed_at: '2026-07-11T00:00:00Z',
        },
        {
          id: 'h3',
          change_type: 'custom_event',
          new_data: null,
          changed_at: '2026-07-12T00:00:00Z',
        },
      ],
      error: null,
    });

    const result = await getAssignmentHistory('a1');
    expect(result).toEqual([
      {
        id: 'h1',
        changeType: 'created',
        label: 'Created',
        changedAt: '2026-07-10T00:00:00Z',
        previousData: undefined,
        newData: null,
      },
      {
        id: 'h2',
        changeType: 'status_changed',
        label: 'Status changed to in progress',
        changedAt: '2026-07-11T00:00:00Z',
        previousData: undefined,
        newData: { status: 'in_progress' },
      },
      {
        id: 'h3',
        changeType: 'custom_event',
        label: 'custom event',
        changedAt: '2026-07-12T00:00:00Z',
        previousData: undefined,
        newData: null,
      },
    ]);
  });

  it('returns empty array when supabase resolves a null payload without error', async () => {
    mockLimit.mockResolvedValue({ data: null, error: null });
    expect(await getAssignmentHistory('a1')).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('returns empty array on error and logs it', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { code: 'ERR', message: 'fail' } });
    expect(await getAssignmentHistory('a1')).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith('[assignment-detail-queries] history error', {
      error: 'fail',
      code: 'ERR',
    });
  });
});

/** The student assignment view's seven-day "Practice log" bars. */
describe('getPracticeWeek', () => {
  // Local noon, so the day buckets are stable regardless of the runner's TZ.
  const NOW = new Date(2026, 6, 20, 12, 0, 0);
  const daysAgo = (n: number, hour = 10) => new Date(2026, 6, 20 - n, hour, 0, 0).toISOString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns seven zeroed days, oldest first, when nothing was logged', async () => {
    mockPracticeLimit.mockResolvedValue({ data: [], error: null });

    const week = await getPracticeWeek('s1', null, NOW);

    expect(week).toHaveLength(7);
    expect(week.every((d) => d.minutes === 0)).toBe(true);
    // 2026-07-20 is a Monday, so the window opens on the Tuesday before.
    expect(week.map((d) => d.label)).toEqual(['Tu', 'We', 'Th', 'Fr', 'Sa', 'Su', 'Mo']);
  });

  it('sums minutes per day and drops rows outside the window', async () => {
    mockPracticeLimit.mockResolvedValue({
      data: [
        { duration_minutes: 10, created_at: daysAgo(0, 8) },
        { duration_minutes: 15, created_at: daysAgo(0, 9) },
        { duration_minutes: 20, created_at: daysAgo(6) },
        { duration_minutes: null, created_at: daysAgo(3) },
        { duration_minutes: 99, created_at: daysAgo(9) },
      ],
      error: null,
    });

    const week = await getPracticeWeek('s1', null, NOW);

    expect(week.map((d) => d.minutes)).toEqual([20, 0, 0, 0, 0, 0, 25]);
  });

  it('scopes to the student and the start of the window, and to the song when given', async () => {
    mockPracticeLimit.mockResolvedValue({ data: [], error: null });

    await getPracticeWeek('s1', 'song1', NOW);

    expect(mockEq).toHaveBeenCalledWith('student_id', 's1');
    expect(mockEq).toHaveBeenCalledWith('song_id', 'song1');
    expect(mockGte).toHaveBeenCalledWith(
      'created_at',
      new Date(2026, 6, 14, 0, 0, 0).toISOString()
    );
  });

  it('does not filter by song when the assignment has none', async () => {
    mockPracticeLimit.mockResolvedValue({ data: [], error: null });

    await getPracticeWeek('s1', null, NOW);

    expect(mockEq).not.toHaveBeenCalledWith('song_id', expect.anything());
  });

  it('warns and still returns an empty week on error', async () => {
    mockPracticeLimit.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const week = await getPracticeWeek('s1', null, NOW);

    expect(week.map((d) => d.minutes)).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(logger.warn).toHaveBeenCalledWith('[assignment-detail-queries] practice week error', {
      error: 'boom',
    });
  });
});
