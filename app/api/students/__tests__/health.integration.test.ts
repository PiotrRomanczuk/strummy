/**
 * Integration tests: the student Health route handler.
 *
 * Calls the route GET handler directly with mocked Supabase -- no HTTP layer.
 * Covers auth, empty state, categorisation logic, sorting, and error handling.
 *
 * Previously also covered `/api/students/pipeline` and
 * `/api/students/needs-attention`. Both were deleted on 2026-08-01: neither had
 * a single caller in the app, and both authenticated without checking a role,
 * so any signed-in student could reach them. `/api/students/health` is the one
 * of the three that is actually mounted (HealthPageClient fetches it).
 */

/* ---------- Mocks (BEFORE imports) ---------- */
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/services/teacher-students', () => ({
  getTeacherStudentIds: jest.fn(),
}));

jest.mock('@/lib/utils/studentHealth', () => ({
  calculateHealthScore: jest.fn(),
}));

/* ---------- Imports ---------- */
import { createClient } from '@/lib/supabase/server';
import { getTeacherStudentIds } from '@/lib/services/teacher-students';
import { calculateHealthScore } from '@/lib/utils/studentHealth';
import { createMockQueryBuilder, createMockAuthContext } from '@/lib/testing/integration-helpers';

const mockedCreateClient = createClient as jest.Mock;
const mockedGetTeacherStudentIds = getTeacherStudentIds as jest.Mock;
const mockedCalculateHealthScore = calculateHealthScore as jest.Mock;

/* ---------- Helpers ---------- */
const TEACHER = createMockAuthContext('teacher');
const STUDENT_IDS = {
  alice: '00000000-aaaa-4000-a000-000000000101',
  bob: '00000000-aaaa-4000-a000-000000000102',
};

/**
 * Extended mock query builder that patches in `lt`, which the standard helper
 * does not provide.
 */
function createExtendedMockQueryBuilder(
  data: unknown = [],
  error: unknown = null,
  count: number | null = null
) {
  const qb = createMockQueryBuilder(data, error, count);
  if (!qb.lt) {
    qb.lt = jest.fn().mockReturnValue(qb);
  }
  return qb;
}

function buildUnauthenticatedClient() {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: jest.fn(() => createExtendedMockQueryBuilder()),
  };
}

/* ================================================================== */
/*  Health route: GET /api/students/health                            */
/* ================================================================== */
describe('GET /api/students/health', () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await import('@/app/api/students/health/route');
    GET = mod.GET;
  });

  /* --- Auth --- */
  it('T17: returns 401 when unauthenticated', async () => {
    mockedCreateClient.mockResolvedValue(buildUnauthenticatedClient());

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('T18: returns 403 for non-admin/non-teacher role', async () => {
    const profilesQb = createExtendedMockQueryBuilder({
      is_admin: false,
      is_teacher: false,
    });
    profilesQb.single.mockResolvedValue({
      data: { is_admin: false, is_teacher: false },
      error: null,
    });

    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'student-id', email: 'student@test.com' } },
          error: null,
        }),
      },
      from: jest.fn(() => profilesQb),
    };

    mockedCreateClient.mockResolvedValue(client);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Forbidden');
  });

  /* --- Empty state --- */
  it('T19: returns empty array when teacher has no students', async () => {
    const profilesQb = createExtendedMockQueryBuilder({
      is_admin: false,
      is_teacher: true,
    });
    profilesQb.single.mockResolvedValue({
      data: { is_admin: false, is_teacher: true },
      error: null,
    });

    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: TEACHER.user },
          error: null,
        }),
      },
      from: jest.fn(() => profilesQb),
    };

    mockedCreateClient.mockResolvedValue(client);
    mockedGetTeacherStudentIds.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  /* --- Happy path with sorting --- */
  it('T20: returns health data sorted by worst score first', async () => {
    const teacherProfile = { is_admin: false, is_teacher: true };
    const studentProfiles = [
      { id: STUDENT_IDS.alice, full_name: 'Alice', email: 'alice@t.com' },
      { id: STUDENT_IDS.bob, full_name: 'Bob', email: 'bob@t.com' },
    ];

    // Alice: healthy (score 85), Bob: at_risk (score 25)
    mockedCalculateHealthScore
      .mockReturnValueOnce({
        score: 85,
        status: 'excellent',
        recommendedAction: 'Keep up the great work!',
      })
      .mockReturnValueOnce({
        score: 25,
        status: 'at_risk',
        recommendedAction: 'Schedule a conversation.',
      });

    let profileCallCount = 0;
    const profilesQb = createExtendedMockQueryBuilder(teacherProfile);
    profilesQb.single.mockResolvedValue({
      data: teacherProfile,
      error: null,
    });
    // When called with .in() for student profiles, return the student list
    profilesQb.in.mockReturnValue({
      ...profilesQb,
      then: jest.fn((resolve: (v: unknown) => void) =>
        resolve({ data: studentProfiles, error: null })
      ),
    });

    // Build per-table mock
    const lessonsQb = createExtendedMockQueryBuilder([]);
    // All lesson queries return empty for simplicity
    lessonsQb.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: [], error: null })
    );

    const assignmentsQb = createExtendedMockQueryBuilder([]);
    assignmentsQb.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: [], error: null })
    );

    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: TEACHER.user },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === 'profiles') {
          profileCallCount++;
          // First call: teacher role check (.single), second: student profiles (.in)
          if (profileCallCount === 1) {
            return profilesQb;
          }
          return {
            ...profilesQb,
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                then: jest.fn((resolve: (v: unknown) => void) =>
                  resolve({ data: studentProfiles, error: null })
                ),
              }),
            }),
          };
        }
        if (table === 'assignments') return assignmentsQb;
        return lessonsQb;
      }),
    };

    mockedCreateClient.mockResolvedValue(client);
    mockedGetTeacherStudentIds.mockResolvedValue([STUDENT_IDS.alice, STUDENT_IDS.bob]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(2);
    // Sorted worst first: Bob (25) before Alice (85)
    expect(body[0].name).toBe('Bob');
    expect(body[0].healthScore).toBe(25);
    expect(body[0].healthStatus).toBe('at_risk');
    expect(body[1].name).toBe('Alice');
    expect(body[1].healthScore).toBe(85);
    expect(body[1].healthStatus).toBe('excellent');
  });

  /* --- Admin access allowed --- */
  it('T21: admin can access health endpoint', async () => {
    const adminProfile = { is_admin: true, is_teacher: false };
    const profilesQb = createExtendedMockQueryBuilder(adminProfile);
    profilesQb.single.mockResolvedValue({
      data: adminProfile,
      error: null,
    });

    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'admin-id', email: 'admin@test.com' } },
          error: null,
        }),
      },
      from: jest.fn(() => profilesQb),
    };

    mockedCreateClient.mockResolvedValue(client);
    mockedGetTeacherStudentIds.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    // Should get through auth (200 with empty array), NOT 403
    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  /* --- Error handling --- */
  it('T22: returns 500 on unexpected error', async () => {
    const profilesQb = createExtendedMockQueryBuilder({ is_admin: false, is_teacher: true });
    profilesQb.single.mockResolvedValue({
      data: { is_admin: false, is_teacher: true },
      error: null,
    });

    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: TEACHER.user },
          error: null,
        }),
      },
      from: jest.fn(() => profilesQb),
    };

    mockedCreateClient.mockResolvedValue(client);
    mockedGetTeacherStudentIds.mockRejectedValue(new Error('DB error'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });
});
