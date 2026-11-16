/**
 * getParentChildOverview: the parent's view of one child. RLS lets a parent
 * read the child's lessons but not the teacher's profile, so the teacher's
 * name is filled in separately — only the name, only for those lessons.
 */

import { getParentChildOverview } from '../parent-dashboard-queries';

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));

const mockIn = jest.fn();
const mockEq = jest.fn();
let teacherRows: Array<{ id: string; full_name: string | null }>;
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => {
      const chain: Record<string, unknown> = {
        select: () => chain,
        in: (column: string, ids: string[]) => {
          mockIn(column, ids);
          return chain;
        },
        eq: (column: string, value: unknown) => {
          mockEq(column, value);
          return Promise.resolve({ data: teacherRows, error: null });
        },
      };
      return chain;
    },
  }),
}));

jest.mock('../parent-child-activity-queries', () => ({
  getChildAssignments: jest.fn().mockResolvedValue([]),
  getChildPastLessons: jest.fn().mockResolvedValue([]),
}));

jest.mock('../student-detail-queries', () => ({
  getStudentProfile: jest.fn().mockResolvedValue({ id: 'child-1', fullName: 'Emma', email: null }),
  getStudentPreferences: jest.fn().mockResolvedValue({ skillLevel: 'beginner' }),
  getStudentRepertoire: jest
    .fn()
    .mockResolvedValue([
      { id: 'r1', songTitle: 'Wonderwall', songAuthor: 'Oasis', status: 'started' },
    ]),
}));

const lesson = (id: string, teacherId: string | null) => ({
  id,
  scheduledAt: '2026-11-20T16:00:00Z',
  title: null,
  teacherId,
  teacherName: null,
});
const mockUpcoming = jest.fn();
const mockLatestNote = jest.fn();
jest.mock('../parent-health-queries', () => ({
  getStudentUpcomingLessons: (...args: unknown[]) => mockUpcoming(...args),
  getStudentLatestNote: (...args: unknown[]) => mockLatestNote(...args),
  getStudentPracticeHistory: jest.fn().mockResolvedValue([]),
}));

beforeEach(() => {
  jest.clearAllMocks();
  teacherRows = [{ id: 't1', full_name: 'Dana Ross' }];
  mockUpcoming.mockResolvedValue([lesson('l1', 't1'), lesson('l2', 't1')]);
  mockLatestNote.mockResolvedValue({
    lessonId: 'l0',
    note: 'Good chord changes',
    teacherId: 't1',
    teacherName: null,
    lessonDate: '2026-11-13T16:00:00Z',
  });
});

describe('getParentChildOverview', () => {
  it("fills in the teacher's name the parent could not read", async () => {
    const child = await getParentChildOverview('child-1', new Date('2026-11-16T10:00:00Z'));
    expect(child?.teacherName).toBe('Dana Ross');
    expect(child?.upcomingLessons.map((l) => l.teacherName)).toEqual(['Dana Ross', 'Dana Ross']);
    expect(child?.latestNote?.teacherName).toBe('Dana Ross');
  });

  it("asks only for the teachers of the child's own lessons, and only teachers", async () => {
    await getParentChildOverview('child-1');
    expect(mockIn).toHaveBeenCalledWith('id', ['t1']);
    expect(mockEq).toHaveBeenCalledWith('is_teacher', true);
  });

  it('makes no lookup when there are no lessons and no note', async () => {
    mockUpcoming.mockResolvedValue([]);
    mockLatestNote.mockResolvedValue(null);
    const child = await getParentChildOverview('child-1');
    expect(mockIn).not.toHaveBeenCalled();
    expect(child?.teacherName).toBeNull();
  });

  it('keeps going without a name when the lookup finds none', async () => {
    teacherRows = [];
    const child = await getParentChildOverview('child-1');
    expect(child?.teacherName).toBeNull();
    expect(child?.upcomingLessons).toHaveLength(2);
  });

  it("passes the child's songs through with title, author and stage only", async () => {
    const child = await getParentChildOverview('child-1');
    expect(child?.songs).toEqual([
      { id: 'r1', title: 'Wonderwall', author: 'Oasis', status: 'started' },
    ]);
  });
});
