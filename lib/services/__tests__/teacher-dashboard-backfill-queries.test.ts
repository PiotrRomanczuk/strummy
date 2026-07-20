import { 
  getAtRiskStudents, 
  getWeekDensity, 
  calcUtilization, 
  getTeacherRoster, 
  getOverdueAssignments, 
  getSongLibrarySummary 
} from '../teacher-dashboard-backfill-queries';
import { logger } from '@/lib/logger';

const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockIs = jest.fn();
const mockIn = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockGte = jest.fn();
const mockLt = jest.fn();
const mockNot = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      from: jest.fn(() => {
        const chain = {
          select: mockSelect.mockImplementation(() => chain),
          eq: mockEq.mockImplementation(() => chain),
          is: mockIs.mockImplementation(() => chain),
          in: mockIn.mockImplementation(() => chain),
          order: mockOrder.mockImplementation(() => chain),
          limit: mockLimit.mockImplementation(() => chain),
          gte: mockGte.mockImplementation(() => chain),
          lt: mockLt.mockImplementation(() => chain),
          not: mockNot.mockImplementation(() => chain),
        };
        return chain;
      }),
    })
  ),
}));

jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

describe('teacher-dashboard-backfill-queries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAtRiskStudents', () => {
    it('returns empty array if no students', async () => {
      mockIs.mockResolvedValueOnce({ data: [], error: null });
      const result = await getAtRiskStudents('t1', new Date());
      expect(result).toEqual([]);
    });

    it('identifies at-risk students (> 7 days without practice)', async () => {
      mockIs.mockResolvedValueOnce({ data: [{ student_id: 's1' }, { student_id: 's2' }], error: null });
      
      const now = new Date('2026-07-20T10:00:00Z');
      const tenDaysAgo = new Date(now.getTime() - 10 * 86_400_000).toISOString();
      const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000).toISOString();

      mockOrder.mockResolvedValueOnce({
        data: [
          { student_id: 's1', last_practiced_at: tenDaysAgo, profiles: [{ full_name: 'S1', email: 's1@e.c' }] },
          { student_id: 's2', last_practiced_at: twoDaysAgo, profiles: [{ full_name: 'S2', email: 's2@e.c' }] },
        ],
        error: null,
      });

      const result = await getAtRiskStudents('t1', now);
      expect(result.length).toBe(1);
      expect(result[0].studentId).toBe('s1');
      expect(result[0].daysSincePractice).toBe(10);
    });

    it('logs error and returns empty array on repertoire error', async () => {
      mockIs.mockResolvedValueOnce({ data: [{ student_id: 's1' }], error: null });
      mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'db err' } });
      const result = await getAtRiskStudents('t1', new Date());
      expect(result).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith('[teacher-dashboard-backfill] at-risk error', { error: 'db err' });
    });
  });

  describe('getWeekDensity', () => {
    it('returns lesson counts per weekday', async () => {
      // 2026-07-20 is a Monday
      const now = new Date('2026-07-20T10:00:00Z');
      mockLt.mockResolvedValueOnce({
        data: [
          { scheduled_at: '2026-07-20T12:00:00Z' }, // Monday
          { scheduled_at: '2026-07-20T14:00:00Z' }, // Monday
          { scheduled_at: '2026-07-22T10:00:00Z' }, // Wednesday
        ],
        error: null,
      });

      const density = await getWeekDensity('t1', now);
      expect(density.find((d) => d.weekday === 'Mon')?.count).toBe(2);
      expect(density.find((d) => d.weekday === 'Wed')?.count).toBe(1);
      expect(density.find((d) => d.weekday === 'Tue')?.count).toBe(0);
    });
  });

  describe('calcUtilization', () => {
    it('calculates booked hours and utilization percentage', () => {
      const density = [
        { weekday: 'Sun', count: 0 },
        { weekday: 'Mon', count: 4 }, // 4 * 45 = 180m = 3h
        { weekday: 'Tue', count: 0 },
        { weekday: 'Wed', count: 4 }, // 4 * 45 = 180m = 3h
        { weekday: 'Thu', count: 0 },
        { weekday: 'Fri', count: 0 },
        { weekday: 'Sat', count: 0 },
      ];
      const util = calcUtilization(density);
      expect(util.bookedHours).toBe(6);
      expect(util.nominalHours).toBe(40);
      expect(util.pct).toBe(15);
    });
  });

  describe('getTeacherRoster', () => {
    it('returns unique students from recent lessons', async () => {
      mockLimit.mockResolvedValueOnce({
        data: [
          { student_id: 's1', scheduled_at: '2026-07-20', profiles: [{ full_name: 'Bob', email: 'bob@e.c' }] },
          { student_id: 's1', scheduled_at: '2026-07-15', profiles: [{ full_name: 'Bob', email: 'bob@e.c' }] },
          { student_id: 's2', scheduled_at: '2026-07-10', profiles: [{ full_name: 'Alice', email: 'alice@e.c' }] },
        ],
        error: null,
      });

      const roster = await getTeacherRoster('t1');
      expect(roster.length).toBe(2);
      expect(roster[0].studentId).toBe('s1');
      expect(roster[1].studentId).toBe('s2');
    });
  });

  describe('getOverdueAssignments', () => {
    it('returns overdue assignments', async () => {
      mockLimit.mockResolvedValueOnce({
        data: [
          { id: 'a1', title: 'A1', due_date: '2026-07-10', student: [{ full_name: 'Bob', email: 'b@c' }] },
        ],
        error: null,
      });

      const result = await getOverdueAssignments('t1', new Date());
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('a1');
      expect(result[0].studentName).toBe('Bob');
    });
  });

  describe('getSongLibrarySummary', () => {
    it('returns count and recent songs', async () => {
      mockIs.mockResolvedValueOnce({ count: 10, error: null });
      mockLimit.mockResolvedValueOnce({
        data: [{ id: 's1', title: 'Song 1', author: 'Author 1' }],
        error: null,
      });

      const result = await getSongLibrarySummary(1);
      expect(result.total).toBe(10);
      expect(result.recent.length).toBe(1);
      expect(result.recent[0].title).toBe('Song 1');
    });
  });
});

// ============================================================================
// Branch families: join-shape variants, null fallbacks, and query-error paths.
// ============================================================================

describe('teacher-dashboard-backfill-queries — branch coverage', () => {
  const NOW = new Date('2026-07-20T12:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAtRiskStudents', () => {
    it('logs and returns [] when the repertoire query errors', async () => {
      mockIs.mockResolvedValueOnce({ data: [{ student_id: 's1' }], error: null });
      mockOrder.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });

      expect(await getAtRiskStudents('t1', NOW)).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        '[teacher-dashboard-backfill] at-risk error',
        expect.objectContaining({ error: 'boom' })
      );
    });

    it('keeps the newest practice date when a student has several rows', async () => {
      mockIs.mockResolvedValueOnce({ data: [{ student_id: 's1' }], error: null });
      mockOrder.mockResolvedValueOnce({
        data: [
          {
            student_id: 's1',
            last_practiced_at: '2026-06-01T00:00:00.000Z',
            profiles: { full_name: 'Emma', email: 'emma@example.com' },
          },
          // Newer row for the same student — must win.
          {
            student_id: 's1',
            last_practiced_at: '2026-07-01T00:00:00.000Z',
            profiles: { full_name: 'Emma', email: 'emma@example.com' },
          },
          // Older row — must be ignored.
          {
            student_id: 's1',
            last_practiced_at: '2026-05-01T00:00:00.000Z',
            profiles: { full_name: 'Emma', email: 'emma@example.com' },
          },
        ],
        error: null,
      });

      const [student] = await getAtRiskStudents('t1', NOW);

      expect(student.lastPracticedAt).toBe('2026-07-01T00:00:00.000Z');
      expect(student.daysSincePractice).toBe(19);
    });

    it('treats a never-practiced student as maximally overdue and unwraps an array join', async () => {
      mockIs.mockResolvedValueOnce({ data: [{ student_id: 's1' }], error: null });
      mockOrder.mockResolvedValueOnce({
        data: [
          {
            student_id: 's1',
            last_practiced_at: null,
            profiles: [{ full_name: 'Liam', email: 'liam@example.com' }],
          },
          // Second null row for the same student exercises the no-op merge arm.
          { student_id: 's1', last_practiced_at: null, profiles: null },
        ],
        error: null,
      });

      const [student] = await getAtRiskStudents('t1', NOW);

      expect(student).toEqual({
        studentId: 's1',
        name: 'Liam',
        email: 'liam@example.com',
        lastPracticedAt: null,
        daysSincePractice: 999,
      });
    });

    it('falls back to nulls when the joined profile is missing', async () => {
      mockIs.mockResolvedValueOnce({ data: [{ student_id: 's1' }], error: null });
      mockOrder.mockResolvedValueOnce({
        data: [{ student_id: 's1', last_practiced_at: null, profiles: null }],
        error: null,
      });

      const [student] = await getAtRiskStudents('t1', NOW);

      expect(student.name).toBeNull();
      expect(student.email).toBeNull();
    });
  });

  describe('getWeekDensity', () => {
    it('logs and returns a zeroed week when the query errors', async () => {
      mockLt.mockResolvedValueOnce({ data: null, error: { message: 'week boom' } });

      const result = await getWeekDensity('t1', NOW);

      expect(result).toHaveLength(7);
      expect(result.every((d) => d.count === 0)).toBe(true);
      expect(logger.warn).toHaveBeenCalledWith(
        '[teacher-dashboard-backfill] week density error',
        expect.objectContaining({ error: 'week boom' })
      );
    });
  });

  describe('getTeacherRoster', () => {
    it('logs and returns [] when the query errors', async () => {
      mockLimit.mockResolvedValueOnce({ data: null, error: { message: 'roster boom' } });

      expect(await getTeacherRoster('t1')).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        '[teacher-dashboard-backfill] roster error',
        expect.objectContaining({ error: 'roster boom' })
      );
    });

    it('dedupes repeat students, unwraps an array join and stops at the limit', async () => {
      mockLimit.mockResolvedValueOnce({
        data: [
          {
            student_id: 's1',
            scheduled_at: '2026-07-19T10:00:00.000Z',
            profiles: [{ full_name: 'Emma', email: 'emma@example.com' }],
          },
          // Same student again — skipped by the `seen` guard.
          { student_id: 's1', scheduled_at: '2026-07-18T10:00:00.000Z', profiles: null },
          { student_id: 's2', scheduled_at: '2026-07-17T10:00:00.000Z', profiles: null },
          // Beyond the limit of 2 — never reached.
          { student_id: 's3', scheduled_at: '2026-07-16T10:00:00.000Z', profiles: null },
        ],
        error: null,
      });

      const roster = await getTeacherRoster('t1', 2);

      expect(roster).toHaveLength(2);
      expect(roster[0]).toMatchObject({ studentId: 's1', name: 'Emma' });
      expect(roster[1]).toMatchObject({ studentId: 's2', name: null, email: null });
    });
  });

  describe('getOverdueAssignments', () => {
    it('logs and returns [] when the query errors', async () => {
      mockLimit.mockResolvedValueOnce({ data: null, error: { message: 'overdue boom' } });

      expect(await getOverdueAssignments('t1', NOW)).toEqual([]);
      expect(logger.warn).toHaveBeenCalledWith(
        '[teacher-dashboard] overdue assignments error',
        expect.objectContaining({ error: 'overdue boom' })
      );
    });

    it('unwraps an array-shaped student join and falls back to nulls', async () => {
      mockLimit.mockResolvedValueOnce({
        data: [
          {
            id: 'a1',
            title: 'Scales',
            due_date: '2026-07-01T00:00:00.000Z',
            student: [{ full_name: 'Emma', email: 'emma@example.com' }],
          },
          { id: 'a2', title: 'Arpeggios', due_date: null, student: null },
        ],
        error: null,
      });

      expect(await getOverdueAssignments('t1', NOW)).toEqual([
        {
          id: 'a1',
          title: 'Scales',
          dueDate: '2026-07-01T00:00:00.000Z',
          studentName: 'Emma',
          studentEmail: 'emma@example.com',
        },
        { id: 'a2', title: 'Arpeggios', dueDate: null, studentName: null, studentEmail: null },
      ]);
    });
  });

  describe('getSongLibrarySummary', () => {
    it('falls back for a missing count, title and author', async () => {
      mockIs.mockResolvedValueOnce({ count: null });
      mockLimit.mockResolvedValueOnce({
        data: [{ id: 'song-1', title: null, author: null }],
      });

      expect(await getSongLibrarySummary()).toEqual({
        total: 0,
        recent: [{ id: 'song-1', title: 'Untitled', author: null }],
      });
    });

    it('returns an empty recent list when the query yields nothing', async () => {
      mockIs.mockResolvedValueOnce({ count: 12 });
      mockLimit.mockResolvedValueOnce({ data: null });

      expect(await getSongLibrarySummary()).toEqual({ total: 12, recent: [] });
    });
  });
});

// Every query in this module coalesces a null `data` to an empty collection.
// These cases exercise those right-arms.
describe('teacher-dashboard-backfill-queries — null-data coalescing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getAtRiskStudents handles a null lessons result', async () => {
    mockIs.mockResolvedValueOnce({ data: null, error: null });

    expect(await getAtRiskStudents('t1', new Date())).toEqual([]);
  });

  it('getAtRiskStudents handles a null repertoire result', async () => {
    mockIs.mockResolvedValueOnce({ data: [{ student_id: 's1' }], error: null });
    mockOrder.mockResolvedValueOnce({ data: null, error: null });

    expect(await getAtRiskStudents('t1', new Date())).toEqual([]);
  });

  it('getWeekDensity handles a null result and ignores an unparseable date', async () => {
    mockLt.mockResolvedValueOnce({ data: null, error: null });

    const empty = await getWeekDensity('t1', new Date('2026-07-20T12:00:00.000Z'));
    expect(empty.every((d) => d.count === 0)).toBe(true);

    mockLt.mockResolvedValueOnce({ data: [{ scheduled_at: 'not-a-date' }], error: null });

    const withJunk = await getWeekDensity('t1', new Date('2026-07-20T12:00:00.000Z'));
    expect(withJunk.every((d) => d.count === 0)).toBe(true);
  });

  it('getTeacherRoster handles a null result and a missing lesson date', async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: null });
    expect(await getTeacherRoster('t1')).toEqual([]);

    mockLimit.mockResolvedValueOnce({
      data: [{ student_id: 's1', scheduled_at: null, profiles: null }],
      error: null,
    });

    const [student] = await getTeacherRoster('t1');
    expect(student.lastLessonAt).toBeNull();
  });

  it('getOverdueAssignments handles a null result', async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: null });

    expect(await getOverdueAssignments('t1', new Date())).toEqual([]);
  });
});
