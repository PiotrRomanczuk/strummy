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
