/**
 * getParentChildOverview: the parent's view of one child. RLS lets a parent
 * read the child's lessons but not the teacher's profile, so the teacher's
 * name is filled in separately through the child_teacher_names RPC, as the
 * parent — only the name, only for the child's own teachers.
 */

import { getParentChildOverview } from './parent-dashboard-queries';

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));
const mockRpc = jest.fn();
let teacherRows: Array<{ id: string; full_name: string }>;
let rpcError: { message: string } | null;
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    rpc: (name: string, args: unknown) => {
      mockRpc(name, args);
      return Promise.resolve({ data: rpcError ? null : teacherRows, error: rpcError });
    },
  }),
}));
const mockAdminClient = jest.fn();
jest.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => mockAdminClient() }));

jest.mock('./parent-child-activity-queries', () => ({
  getChildAssignments: jest.fn().mockResolvedValue([]),
  getChildPastLessons: jest.fn().mockResolvedValue([]),
}));

jest.mock('./student-detail-queries', () => ({
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
jest.mock('./parent-health-queries', () => ({
  getStudentUpcomingLessons: (...args: unknown[]) => mockUpcoming(...args),
  getStudentLatestNote: (...args: unknown[]) => mockLatestNote(...args),
  getStudentPracticeHistory: jest.fn().mockResolvedValue([]),
}));

beforeEach(() => {
  jest.clearAllMocks();
  teacherRows = [{ id: 't1', full_name: 'Dana Ross' }];
  rpcError = null;
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

  it("asks the parent's own session for this child's teacher names, never the service role", async () => {
    await getParentChildOverview('child-1');
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith('child_teacher_names', { p_child_id: 'child-1' });
    expect(mockAdminClient).not.toHaveBeenCalled();
  });

  it('makes no lookup when there are no lessons and no note', async () => {
    mockUpcoming.mockResolvedValue([]);
    mockLatestNote.mockResolvedValue(null);
    const child = await getParentChildOverview('child-1');
    expect(mockRpc).not.toHaveBeenCalled();
    expect(child?.teacherName).toBeNull();
  });

  it('makes no lookup when every name is already known', async () => {
    mockUpcoming.mockResolvedValue([{ ...lesson('l1', 't1'), teacherName: 'Dana Ross' }]);
    mockLatestNote.mockResolvedValue(null);
    const child = await getParentChildOverview('child-1');
    expect(mockRpc).not.toHaveBeenCalled();
    expect(child?.teacherName).toBe('Dana Ross');
  });

  it('keeps going without a name when the lookup finds none or fails', async () => {
    teacherRows = [];
    expect((await getParentChildOverview('child-1'))?.teacherName).toBeNull();
    rpcError = { message: 'boom' };
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
