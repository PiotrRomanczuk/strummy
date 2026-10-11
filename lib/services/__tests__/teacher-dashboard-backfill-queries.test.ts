import {
  getAtRiskStudents,
  getWeekDensity,
  calcUtilization,
  getOverdueAssignments,
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
      mockIs.mockResolvedValueOnce({
        data: [{ student_id: 's1' }, { student_id: 's2' }],
        error: null,
      });

      const now = new Date('2026-07-20T10:00:00Z');
      const tenDaysAgo = new Date(now.getTime() - 10 * 86_400_000).toISOString();
      const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000).toISOString();

      mockOrder.mockResolvedValueOnce({
        data: [
          {
            student_id: 's1',
            last_practiced_at: tenDaysAgo,
            profiles: [{ full_name: 'S1', email: 's1@e.c' }],
          },
          {
            student_id: 's2',
            last_practiced_at: twoDaysAgo,
            profiles: [{ full_name: 'S2', email: 's2@e.c' }],
          },
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
      expect(logger.warn).toHaveBeenCalledWith('[teacher-dashboard-backfill] at-risk error', {
        error: 'db err',
      });
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

    it('returns the seven dated days of the Mon–Sun week with today flagged', async () => {
      // Local time, so the week boundaries match the function's local-midnight math.
      const now = new Date(2026, 6, 22, 10, 0, 0); // Wednesday 2026-07-22
      mockLt.mockResolvedValueOnce({ data: [], error: null });

      const density = await getWeekDensity('t1', now);

      expect(density.map((d) => d.weekday)).toEqual([
        'Mon',
        'Tue',
        'Wed',
        'Thu',
        'Fri',
        'Sat',
        'Sun',
      ]);
      expect(density.map((d) => d.date)).toEqual([
        '2026-07-20',
        '2026-07-21',
        '2026-07-22',
        '2026-07-23',
        '2026-07-24',
        '2026-07-25',
        '2026-07-26',
      ]);
      expect(density.filter((d) => d.isToday).map((d) => d.weekday)).toEqual(['Wed']);
    });
  });

  describe('calcUtilization', () => {
    it('calculates booked hours and utilization percentage', () => {
      const day = (weekday: string, count: number, date: string) => ({
        weekday,
        count,
        date,
        isToday: false,
      });
      const density = [
        day('Mon', 4, '2026-07-20'), // 4 * 45 = 180m = 3h
        day('Tue', 0, '2026-07-21'),
        day('Wed', 4, '2026-07-22'), // 4 * 45 = 180m = 3h
        day('Thu', 0, '2026-07-23'),
        day('Fri', 0, '2026-07-24'),
        day('Sat', 0, '2026-07-25'),
        day('Sun', 0, '2026-07-26'),
      ];
      const util = calcUtilization(density);
      expect(util.bookedHours).toBe(6);
      expect(util.nominalHours).toBe(40);
      expect(util.pct).toBe(15);
    });
  });

  describe('getOverdueAssignments', () => {
    it('returns overdue assignments', async () => {
      mockLimit.mockResolvedValueOnce({
        data: [
          {
            id: 'a1',
            title: 'A1',
            due_date: '2026-07-10',
            student: [{ full_name: 'Bob', email: 'b@c' }],
          },
        ],
        error: null,
      });

      const result = await getOverdueAssignments('t1', new Date());
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('a1');
      expect(result[0].studentName).toBe('Bob');
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
        // `null`, not a 999 sentinel — the sentinel used to reach the UI as the
        // literal text "999d". The row is still surfaced and still sorts worst.
        daysSincePractice: null,
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

  it('getOverdueAssignments handles a null result', async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: null });

    expect(await getOverdueAssignments('t1', new Date())).toEqual([]);
  });
});
