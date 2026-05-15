/**
 * Integration tests: multi-role visibility filtering
 *
 * Verifies that getAssignmentsHandler applies the correct role-based
 * filters so that admins see everything, teachers see only their own
 * assignments, students see only their own, and unknown roles see nothing.
 */
import {
  createMockQueryBuilder,
  createMockAuthContext,
} from '@/lib/testing/integration-helpers';

jest.mock('@/lib/services/notification-service', () => ({
  queueNotification: jest.fn().mockResolvedValue(undefined),
}));

import { getAssignmentsHandler } from '@/app/api/(curriculum)/assignments/handlers';

/* ---------- Helpers ---------- */

/**
 * Build a supabase mock whose `from('assignments')` call returns
 * a fresh query-builder we can spy on.
 */
function buildSupabase() {
  const qb = createMockQueryBuilder([]);
  return {
    client: {
      from: jest.fn(() => qb),
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: {} }, error: null }),
      },
    },
    qb,
  };
}

/* ========================================================== */
describe('Multi-role visibility filtering', () => {
  /* -------------------------------------------------------- */
  it('admin profile: query does NOT add teacher_id or student_id eq filter', async () => {
    const { client, qb } = buildSupabase();
    const ctx = createMockAuthContext('admin');

    await getAssignmentsHandler(client as never, ctx.userId, ctx.profileMapped, {});

    // Admin path calls: .select(), .is('deleted_at', null), .order()
    // It should NOT call .eq('teacher_id', ...) or .eq('student_id', ...)
    const eqCalls = qb.eq.mock.calls;
    const hasTeacherFilter = eqCalls.some(
      ([col]: [string]) => col === 'teacher_id'
    );
    const hasStudentFilter = eqCalls.some(
      ([col]: [string]) => col === 'student_id'
    );
    expect(hasTeacherFilter).toBe(false);
    expect(hasStudentFilter).toBe(false);
  });

  /* -------------------------------------------------------- */
  it('teacher profile: query includes eq("teacher_id", teacherId)', async () => {
    const { client, qb } = buildSupabase();
    const ctx = createMockAuthContext('teacher');

    await getAssignmentsHandler(client as never, ctx.userId, ctx.profileMapped, {});

    const eqCalls = qb.eq.mock.calls;
    const teacherFilter = eqCalls.find(
      ([col, val]: [string, string]) => col === 'teacher_id' && val === ctx.userId
    );
    expect(teacherFilter).toBeDefined();
  });

  /* -------------------------------------------------------- */
  it('student profile: query includes eq("student_id", studentId)', async () => {
    const { client, qb } = buildSupabase();
    const ctx = createMockAuthContext('student');

    await getAssignmentsHandler(client as never, ctx.userId, ctx.profileMapped, {});

    const eqCalls = qb.eq.mock.calls;
    const studentFilter = eqCalls.find(
      ([col, val]: [string, string]) => col === 'student_id' && val === ctx.userId
    );
    expect(studentFilter).toBeDefined();
  });

  /* -------------------------------------------------------- */
  it('no-role profile: query restricts to impossible UUID', async () => {
    const { client, qb } = buildSupabase();

    const noRoleProfile = {
      isAdmin: false,
      isTeacher: false,
      isStudent: false,
    };

    await getAssignmentsHandler(
      client as never,
      '00000000-0000-0000-0000-ffffffffffff',
      noRoleProfile,
      {}
    );

    const eqCalls = qb.eq.mock.calls;
    const impossibleFilter = eqCalls.find(
      ([col, val]: [string, string]) =>
        col === 'id' && val === '00000000-0000-0000-0000-000000000000'
    );
    expect(impossibleFilter).toBeDefined();
  });
});
