/**
 * Guards which id the dashboard hands to its data layer.
 *
 * Since the identity-model rebuild `profiles.id` and the auth id are different
 * values, and every domain FK the dashboard filters on (lessons.teacher_id,
 * lessons.student_id, assignments.*, profiles.parent_id) lives in profile-id
 * space. Passing the auth id is a valid comparison that matches nothing, so the
 * whole dashboard silently renders its empty state -- no error, no log.
 *
 * The per-query unit tests cannot catch this: they call each function directly
 * with an id, so they never observe which id the page chose. That assertion has
 * to live here.
 */

const AUTH_ID = 'auth-0000-0000-0000-000000000000';
const PROFILE_ID = 'prof-1111-1111-1111-111111111111';

const getUserWithRolesSSR = jest.fn();
const teacherDayLessons = jest.fn();
const atRiskStudents = jest.fn();
const overdueAssignments = jest.fn();
const weekDensity = jest.fn();
const studioRoster = jest.fn();
const weekComparison = jest.fn();
const libraryQuickAssign = jest.fn();
const loadStudentHome = jest.fn();
const parentChildren = jest.fn();
const adminPlatform = jest.fn();
const recentAudit = jest.fn();
const platformPulse = jest.fn();
const pendingInvites = jest.fn();
const lockedAccounts = jest.fn();

jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: (...a: unknown[]) => getUserWithRolesSSR(...a),
}));
jest.mock('@/lib/services/teacher-dashboard-queries', () => ({
  getTeacherDayLessons: (...a: unknown[]) => teacherDayLessons(...a),
  summariseDayLessons: () => ({ total: 0, completed: 0, remaining: 0 }),
}));
jest.mock('@/lib/services/teacher-dashboard-backfill-queries', () => ({
  getAtRiskStudents: (...a: unknown[]) => atRiskStudents(...a),
  getOverdueAssignments: (...a: unknown[]) => overdueAssignments(...a),
  getWeekDensity: (...a: unknown[]) => weekDensity(...a),
  calcUtilization: () => ({ pct: 0, bookedHours: 0, nominalHours: 40 }),
}));
jest.mock('@/lib/services/teacher-dashboard-studio-queries', () => ({
  getStudioRoster: (...a: unknown[]) => studioRoster(...a),
  getWeekComparison: (...a: unknown[]) => weekComparison(...a),
  getLibraryQuickAssign: (...a: unknown[]) => libraryQuickAssign(...a),
}));
jest.mock('@/components/dashboard/student/student-home.data', () => ({
  loadStudentHome: (...a: unknown[]) => loadStudentHome(...a),
}));
jest.mock('@/lib/services/admin-platform-queries', () => ({
  getAdminPlatform: (...a: unknown[]) => adminPlatform(...a),
}));
jest.mock('@/lib/services/admin-audit-queries', () => ({
  getRecentAudit: (...a: unknown[]) => recentAudit(...a),
}));
jest.mock('@/lib/services/admin-dashboard-queries', () => ({
  getPlatformPulse: (...a: unknown[]) => platformPulse(...a),
  getPendingInvites: (...a: unknown[]) => pendingInvites(...a),
}));
jest.mock('@/app/actions/admin/lockout', () => ({
  getLockedAccounts: (...a: unknown[]) => lockedAccounts(...a),
}));
jest.mock('@/lib/services/parent-dashboard-queries', () => ({
  getParentChildren: (...a: unknown[]) => parentChildren(...a),
  getParentChildOverview: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/app/actions/song-of-the-week', () => ({
  getCurrentSongOfTheWeek: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: { full_name: 'Test' } }) }),
      }),
    }),
  }),
}));

// Presentational shells -- this test is about arguments, not markup.
jest.mock('@/components/dashboard/teacher/TeacherDashboard', () => ({
  TeacherDashboard: () => null,
}));
jest.mock('@/components/dashboard/student/StudentDashboard', () => ({
  StudentDashboard: () => null,
}));
jest.mock('@/components/dashboard/admin/AdminDashboard', () => ({ AdminDashboard: () => null }));
jest.mock('@/components/dashboard/parent', () => ({
  ParentView: ({ profileId }: { profileId: string }) => {
    parentChildren(profileId);
    return null;
  },
}));
jest.mock('next/font/google', () => ({
  Fraunces: () => ({ variable: 'f' }),
  Geist: () => ({ variable: 'g' }),
  Geist_Mono: () => ({ variable: 'gm' }),
}));
jest.mock('@/app/design-tokens.css', () => ({}), { virtual: true });

import DashboardPage from '../page';

const roles = (over: Record<string, boolean>) => ({
  user: { id: AUTH_ID, email: 'teacher@example.com' },
  profileId: PROFILE_ID,
  isAdmin: false,
  isTeacher: false,
  isStudent: false,
  isParent: false,
  isDevelopment: false,
  ...over,
});

// DashboardPage returns the view element itself (<TeacherView … />), and that
// view is an async server component -- its body, where the queries live, only
// runs once we invoke it.
const render = async (view: string) => {
  const el = (await DashboardPage({ searchParams: Promise.resolve({ view }) })) as {
    type?: (p: unknown) => unknown;
    props?: unknown;
  };
  if (typeof el?.type === 'function') await el.type(el.props);
  return el;
};

beforeEach(() => {
  jest.clearAllMocks();
  lockedAccounts.mockResolvedValue({ success: true, accounts: [] });
});

describe('dashboard identity: profile id vs auth id', () => {
  it('gives every teacher query the profile id, never the auth id', async () => {
    getUserWithRolesSSR.mockResolvedValue(roles({ isTeacher: true }));
    await render('teacher');

    for (const fn of [
      teacherDayLessons,
      atRiskStudents,
      overdueAssignments,
      weekDensity,
      studioRoster,
      weekComparison,
      libraryQuickAssign,
    ]) {
      expect(fn).toHaveBeenCalled();
      expect(fn.mock.calls[0][0]).toBe(PROFILE_ID);
      expect(fn.mock.calls[0][0]).not.toBe(AUTH_ID);
    }
  });

  it('gives every student query the profile id, never the auth id', async () => {
    getUserWithRolesSSR.mockResolvedValue(roles({ isStudent: true }));
    await render('student');

    // loadStudentHome fans out to every student-home query with this id.
    expect(loadStudentHome).toHaveBeenCalledTimes(1);
    expect(loadStudentHome.mock.calls[0][0]).toBe(PROFILE_ID);
    expect(loadStudentHome.mock.calls[0][0]).not.toBe(AUTH_ID);
    expect(loadStudentHome.mock.calls[0][1]).toBeInstanceOf(Date);
  });

  it('loads platform-wide admin data without scoping it to any user id', async () => {
    getUserWithRolesSSR.mockResolvedValue(roles({ isAdmin: true }));
    await render('admin');

    expect(adminPlatform).toHaveBeenCalledTimes(1);
    expect(adminPlatform.mock.calls[0][0]).toBeInstanceOf(Date);
    expect(recentAudit).toHaveBeenCalledTimes(1);
    expect(platformPulse).toHaveBeenCalledTimes(1);
    expect(pendingInvites).toHaveBeenCalledTimes(1);
    for (const fn of [adminPlatform, recentAudit, platformPulse, pendingInvites]) {
      expect(fn.mock.calls[0]).not.toContain(PROFILE_ID);
      expect(fn.mock.calls[0]).not.toContain(AUTH_ID);
    }
  });

  it('gives the parent view the profile id (profiles.parent_id references profiles.id)', async () => {
    getUserWithRolesSSR.mockResolvedValue(roles({ isParent: true }));
    await render('parent');

    expect(parentChildren).toHaveBeenCalledWith(PROFILE_ID);
  });
});
