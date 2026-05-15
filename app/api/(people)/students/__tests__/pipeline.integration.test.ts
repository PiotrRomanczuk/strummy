/**
 * Integration tests: Student Pipeline, Needs-Attention, and Health route handlers.
 *
 * Calls route GET handlers directly with mocked Supabase -- no HTTP layer.
 * Covers auth, empty state, categorisation logic, sorting, and error handling.
 */

/* ---------- Mocks (BEFORE imports) ---------- */
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/queries/teacher-students', () => ({
  getTeacherStudentIds: jest.fn(),
}));

jest.mock('@/lib/utils/studentHealth', () => ({
  calculateHealthScore: jest.fn(),
}));

/* ---------- Imports ---------- */
import { createClient } from '@/lib/supabase/server';
import { getTeacherStudentIds } from '@/lib/queries/teacher-students';
import { calculateHealthScore } from '@/lib/utils/studentHealth';
import {
  createMockQueryBuilder,
  createMockAuthContext,
} from '@/lib/testing/integration-helpers';

const mockedCreateClient = createClient as jest.Mock;
const mockedGetTeacherStudentIds = getTeacherStudentIds as jest.Mock;
const mockedCalculateHealthScore = calculateHealthScore as jest.Mock;

/* ---------- Helpers ---------- */
const TEACHER = createMockAuthContext('teacher');
const STUDENT_IDS = {
  alice: '00000000-aaaa-4000-a000-000000000101',
  bob: '00000000-aaaa-4000-a000-000000000102',
  carol: '00000000-aaaa-4000-a000-000000000103',
  dave: '00000000-aaaa-4000-a000-000000000104',
};

/** Date string N days in the past. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

/**
 * Extended mock query builder that adds `lt` (used by needs-attention route).
 * Wraps the standard helper and patches in the missing method.
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

/**
 * Build a mock Supabase client wired for auth + per-table query builders.
 */
function buildAuthenticatedClient(
  tables: Record<string, ReturnType<typeof createMockQueryBuilder>>,
  user = TEACHER.user
) {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
    },
    from: jest.fn((table: string) => {
      return tables[table] ?? createExtendedMockQueryBuilder();
    }),
  };
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
/*  1. Pipeline route: GET /api/students/pipeline                     */
/* ================================================================== */
describe('GET /api/students/pipeline', () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    jest.clearAllMocks();
    // Dynamic import so mocks are active before the module loads
    const mod = await import('@/app/api/(people)/students/pipeline/route');
    GET = mod.GET;
  });

  /* --- Auth --- */
  it('T1: returns 401 when unauthenticated', async () => {
    mockedCreateClient.mockResolvedValue(buildUnauthenticatedClient());

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  /* --- Empty state --- */
  it('T2: returns all-zero stages when teacher has no students', async () => {
    mockedCreateClient.mockResolvedValue(
      buildAuthenticatedClient({})
    );
    mockedGetTeacherStudentIds.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.stages).toHaveLength(4);
    body.stages.forEach((stage: { count: number }) => {
      expect(stage.count).toBe(0);
    });
    expect(body.conversions).toEqual({ leadToTrial: 0, trialToActive: 0 });
  });

  /* --- Pipeline categorisation --- */
  it('T3: student with 0 lessons is categorised as lead', async () => {
    const lessonsQb = createExtendedMockQueryBuilder([], null, 0);
    // count query (head: true) resolves via `then` with count: 0
    lessonsQb.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null, count: 0 })
    );

    const client = buildAuthenticatedClient({ lessons: lessonsQb });
    mockedCreateClient.mockResolvedValue(client);
    mockedGetTeacherStudentIds.mockResolvedValue([STUDENT_IDS.alice]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    const leadStage = body.stages.find((s: { id: string }) => s.id === 'lead');
    expect(leadStage.count).toBe(1);
  });

  it('T4: student with 1 lesson is categorised as trial', async () => {
    const lessonsQb = createExtendedMockQueryBuilder([], null, 1);
    // Count query resolves with count: 1
    lessonsQb.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null, count: 1 })
    );
    // Recent lessons query resolves via single-like then
    lessonsQb.limit.mockReturnValue({
      ...lessonsQb,
      then: jest.fn((resolve: (v: unknown) => void) =>
        resolve({ data: [{ created_at: daysAgo(5) }], error: null })
      ),
    });

    const client = buildAuthenticatedClient({ lessons: lessonsQb });
    mockedCreateClient.mockResolvedValue(client);
    mockedGetTeacherStudentIds.mockResolvedValue([STUDENT_IDS.bob]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    const trialStage = body.stages.find((s: { id: string }) => s.id === 'trial');
    expect(trialStage.count).toBe(1);
  });

  it('T5: student with 2+ recent lessons is categorised as active', async () => {
    const lessonsQb = createExtendedMockQueryBuilder([], null, 3);
    lessonsQb.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null, count: 3 })
    );
    lessonsQb.limit.mockReturnValue({
      ...lessonsQb,
      then: jest.fn((resolve: (v: unknown) => void) =>
        resolve({ data: [{ created_at: daysAgo(5) }], error: null })
      ),
    });

    const client = buildAuthenticatedClient({ lessons: lessonsQb });
    mockedCreateClient.mockResolvedValue(client);
    mockedGetTeacherStudentIds.mockResolvedValue([STUDENT_IDS.carol]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    const activeStage = body.stages.find((s: { id: string }) => s.id === 'active');
    expect(activeStage.count).toBe(1);
  });

  it('T6: student with 2+ lessons but none in 30 days is at_risk', async () => {
    const lessonsQb = createExtendedMockQueryBuilder([], null, 4);
    lessonsQb.then.mockImplementation((resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null, count: 4 })
    );
    lessonsQb.limit.mockReturnValue({
      ...lessonsQb,
      then: jest.fn((resolve: (v: unknown) => void) =>
        resolve({ data: [{ created_at: daysAgo(45) }], error: null })
      ),
    });

    const client = buildAuthenticatedClient({ lessons: lessonsQb });
    mockedCreateClient.mockResolvedValue(client);
    mockedGetTeacherStudentIds.mockResolvedValue([STUDENT_IDS.dave]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    const atRiskStage = body.stages.find((s: { id: string }) => s.id === 'at_risk');
    expect(atRiskStage.count).toBe(1);
  });

  /* --- Conversion rates --- */
  it('T7: computes conversion rates correctly', async () => {
    // Set up 4 students: 2 leads (0 lessons), 1 trial (1 lesson), 1 active (3 lessons recent)
    const studentIds = [
      STUDENT_IDS.alice,
      STUDENT_IDS.bob,
      STUDENT_IDS.carol,
      STUDENT_IDS.dave,
    ];

    // We need per-call control. The route calls supabase.from('lessons') twice per student.
    // Call pattern per student: count query (select head:true, eq), then recent query (select, eq, order, limit).
    // Total: 8 from('lessons') calls for 4 students.
    let callIndex = 0;
    const countValues = [0, 0, 1, 3]; // alice=lead, bob=lead, carol=trial, dave=active
    const recentValues = [
      [],
      [],
      [{ created_at: daysAgo(3) }],
      [{ created_at: daysAgo(2) }],
    ];

    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: TEACHER.user },
          error: null,
        }),
      },
      from: jest.fn(() => {
        const idx = Math.floor(callIndex / 2);
        const isCountCall = callIndex % 2 === 0;
        callIndex++;

        const qb = createExtendedMockQueryBuilder();
        if (isCountCall) {
          qb.then.mockImplementation((resolve: (v: unknown) => void) =>
            resolve({ data: null, error: null, count: countValues[idx] })
          );
        } else {
          qb.limit.mockReturnValue({
            ...qb,
            then: jest.fn((resolve: (v: unknown) => void) =>
              resolve({ data: recentValues[idx], error: null })
            ),
          });
        }
        return qb;
      }),
    };

    mockedCreateClient.mockResolvedValue(client);
    mockedGetTeacherStudentIds.mockResolvedValue(studentIds);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    // 2 leads, 1 trial, 1 active, 0 at_risk
    expect(body.stages.find((s: { id: string }) => s.id === 'lead').count).toBe(2);
    expect(body.stages.find((s: { id: string }) => s.id === 'trial').count).toBe(1);
    expect(body.stages.find((s: { id: string }) => s.id === 'active').count).toBe(1);
    // leadToTrial = trial / (leads + trial) * 100 = 1 / 3 * 100 = 33
    expect(body.conversions.leadToTrial).toBe(33);
    // trialToActive = active / (trial + active) * 100 = 1 / 2 * 100 = 50
    expect(body.conversions.trialToActive).toBe(50);
  });

  /* --- Error handling --- */
  it('T8: returns 500 when getTeacherStudentIds throws', async () => {
    mockedCreateClient.mockResolvedValue(
      buildAuthenticatedClient({})
    );
    mockedGetTeacherStudentIds.mockRejectedValue(new Error('DB connection failed'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });
});

/* ================================================================== */
/*  2. Needs-Attention route: GET /api/students/needs-attention        */
/* ================================================================== */
describe('GET /api/students/needs-attention', () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await import('@/app/api/(people)/students/needs-attention/route');
    GET = mod.GET;
  });

  /* --- Auth --- */
  it('T9: returns 401 when unauthenticated', async () => {
    mockedCreateClient.mockResolvedValue(buildUnauthenticatedClient());

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  /* --- Empty state --- */
  it('T10: returns empty array when teacher has no students', async () => {
    mockedCreateClient.mockResolvedValue(
      buildAuthenticatedClient({})
    );
    mockedGetTeacherStudentIds.mockResolvedValue([]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  /* --- Inactive student (no lessons) --- */
  it('T11: flags student with no lessons as inactive', async () => {
    const profilesQb = createExtendedMockQueryBuilder([
      { id: STUDENT_IDS.alice, full_name: 'Alice Smith', email: 'alice@test.com' },
    ]);

    const lessonsQb = createExtendedMockQueryBuilder([]);
    lessonsQb.limit.mockReturnValue({
      ...lessonsQb,
      then: jest.fn((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      ),
    });

    const assignmentsQb = createExtendedMockQueryBuilder([]);
    assignmentsQb.lt = jest.fn().mockReturnValue(assignmentsQb);
    assignmentsQb.limit.mockReturnValue({
      ...assignmentsQb,
      then: jest.fn((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      ),
    });

    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: TEACHER.user },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === 'profiles') return profilesQb;
        if (table === 'assignments') return assignmentsQb;
        return lessonsQb;
      }),
    };

    mockedCreateClient.mockResolvedValue(client);
    mockedGetTeacherStudentIds.mockResolvedValue([STUDENT_IDS.alice]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].reason).toBe('inactive');
    expect(body[0].studentName).toBe('Alice Smith');
    expect(body[0].daysAgo).toBe(999);
  });

  /* --- No recent lesson (>14 days) --- */
  it('T12: flags student with last lesson >14 days ago as no_recent_lesson', async () => {
    const profilesQb = createExtendedMockQueryBuilder([
      { id: STUDENT_IDS.bob, full_name: 'Bob Jones', email: 'bob@test.com' },
    ]);

    const lessonsQb = createExtendedMockQueryBuilder([]);
    lessonsQb.limit.mockReturnValue({
      ...lessonsQb,
      then: jest.fn((resolve: (v: unknown) => void) =>
        resolve({ data: [{ created_at: daysAgo(20) }], error: null })
      ),
    });

    const assignmentsQb = createExtendedMockQueryBuilder([]);
    assignmentsQb.lt = jest.fn().mockReturnValue(assignmentsQb);
    assignmentsQb.limit.mockReturnValue({
      ...assignmentsQb,
      then: jest.fn((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      ),
    });

    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: TEACHER.user },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === 'profiles') return profilesQb;
        if (table === 'assignments') return assignmentsQb;
        return lessonsQb;
      }),
    };

    mockedCreateClient.mockResolvedValue(client);
    mockedGetTeacherStudentIds.mockResolvedValue([STUDENT_IDS.bob]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    const noRecentItem = body.find(
      (item: { reason: string }) => item.reason === 'no_recent_lesson'
    );
    expect(noRecentItem).toBeDefined();
    expect(noRecentItem.daysAgo).toBeGreaterThanOrEqual(19);
    expect(noRecentItem.daysAgo).toBeLessThanOrEqual(21);
  });

  /* --- Overdue assignment --- */
  it('T13: flags student with overdue assignment', async () => {
    const profilesQb = createExtendedMockQueryBuilder([
      { id: STUDENT_IDS.carol, full_name: 'Carol White', email: 'carol@test.com' },
    ]);

    // Recent lesson exists (within 14 days) so no no_recent_lesson flag
    const lessonsQb = createExtendedMockQueryBuilder([]);
    lessonsQb.limit.mockReturnValue({
      ...lessonsQb,
      then: jest.fn((resolve: (v: unknown) => void) =>
        resolve({ data: [{ created_at: daysAgo(3) }], error: null })
      ),
    });

    // Overdue assignment: due 10 days ago
    const assignmentsQb = createExtendedMockQueryBuilder([]);
    assignmentsQb.lt = jest.fn().mockReturnValue(assignmentsQb);
    assignmentsQb.limit.mockReturnValue({
      ...assignmentsQb,
      then: jest.fn((resolve: (v: unknown) => void) =>
        resolve({ data: [{ due_date: daysAgo(10) }], error: null })
      ),
    });

    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: TEACHER.user },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === 'profiles') return profilesQb;
        if (table === 'assignments') return assignmentsQb;
        return lessonsQb;
      }),
    };

    mockedCreateClient.mockResolvedValue(client);
    mockedGetTeacherStudentIds.mockResolvedValue([STUDENT_IDS.carol]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    const overdueItem = body.find(
      (item: { reason: string }) => item.reason === 'overdue_assignment'
    );
    expect(overdueItem).toBeDefined();
    expect(overdueItem.actionUrl).toContain('/dashboard/assignments');
  });

  /* --- Severity sorting --- */
  it('T14: sorts by severity: overdue > no_recent_lesson > inactive', async () => {
    const profiles = [
      { id: STUDENT_IDS.alice, full_name: 'Alice', email: 'a@t.com' },
      { id: STUDENT_IDS.bob, full_name: 'Bob', email: 'b@t.com' },
      { id: STUDENT_IDS.carol, full_name: 'Carol', email: 'c@t.com' },
    ];
    const profilesQb = createExtendedMockQueryBuilder(profiles);

    // Alice: inactive (no lessons)
    // Bob: no_recent_lesson (lesson 20 days ago)
    // Carol: overdue_assignment (recent lesson but overdue hw)
    let lessonCallIdx = 0;
    const lessonResults = [
      [], // Alice: no lessons
      [{ created_at: daysAgo(20) }], // Bob: old lesson
      [{ created_at: daysAgo(2) }], // Carol: recent lesson
    ];

    let assignmentCallIdx = 0;
    const assignmentResults = [
      [], // Alice: no assignments
      [], // Bob: no overdue assignments
      [{ due_date: daysAgo(5) }], // Carol: overdue
    ];

    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: TEACHER.user },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === 'profiles') return profilesQb;

        if (table === 'assignments') {
          const idx = assignmentCallIdx++;
          const qb = createExtendedMockQueryBuilder([]);
          qb.lt = jest.fn().mockReturnValue(qb);
          qb.limit.mockReturnValue({
            ...qb,
            then: jest.fn((resolve: (v: unknown) => void) =>
              resolve({ data: assignmentResults[idx] ?? [], error: null })
            ),
          });
          return qb;
        }

        // lessons
        const idx = lessonCallIdx++;
        const qb = createExtendedMockQueryBuilder([]);
        qb.limit.mockReturnValue({
          ...qb,
          then: jest.fn((resolve: (v: unknown) => void) =>
            resolve({ data: lessonResults[idx] ?? [], error: null })
          ),
        });
        return qb;
      }),
    };

    mockedCreateClient.mockResolvedValue(client);
    mockedGetTeacherStudentIds.mockResolvedValue([
      STUDENT_IDS.alice,
      STUDENT_IDS.bob,
      STUDENT_IDS.carol,
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    // Overdue first, then no_recent_lesson, then inactive
    const reasons = body.map((item: { reason: string }) => item.reason);
    const overdueIdx = reasons.indexOf('overdue_assignment');
    const noRecentIdx = reasons.indexOf('no_recent_lesson');
    const inactiveIdx = reasons.indexOf('inactive');
    expect(overdueIdx).toBeLessThan(noRecentIdx);
    expect(noRecentIdx).toBeLessThan(inactiveIdx);
  });

  /* --- Error handling --- */
  it('T15: returns 500 on unexpected error', async () => {
    mockedCreateClient.mockResolvedValue(
      buildAuthenticatedClient({})
    );
    mockedGetTeacherStudentIds.mockRejectedValue(new Error('Connection timeout'));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Internal server error');
  });

  /* --- Fallback student name --- */
  it('T16: uses email when full_name is null', async () => {
    const profilesQb = createExtendedMockQueryBuilder([
      { id: STUDENT_IDS.alice, full_name: null, email: 'alice@test.com' },
    ]);

    const lessonsQb = createExtendedMockQueryBuilder([]);
    lessonsQb.limit.mockReturnValue({
      ...lessonsQb,
      then: jest.fn((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      ),
    });

    const assignmentsQb = createExtendedMockQueryBuilder([]);
    assignmentsQb.lt = jest.fn().mockReturnValue(assignmentsQb);
    assignmentsQb.limit.mockReturnValue({
      ...assignmentsQb,
      then: jest.fn((resolve: (v: unknown) => void) =>
        resolve({ data: [], error: null })
      ),
    });

    const client = {
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: TEACHER.user },
          error: null,
        }),
      },
      from: jest.fn((table: string) => {
        if (table === 'profiles') return profilesQb;
        if (table === 'assignments') return assignmentsQb;
        return lessonsQb;
      }),
    };

    mockedCreateClient.mockResolvedValue(client);
    mockedGetTeacherStudentIds.mockResolvedValue([STUDENT_IDS.alice]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body[0].studentName).toBe('alice@test.com');
  });
});

/* ================================================================== */
/*  3. Health route: GET /api/students/health                          */
/* ================================================================== */
describe('GET /api/students/health', () => {
  let GET: () => Promise<Response>;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await import('@/app/api/(people)/students/health/route');
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
