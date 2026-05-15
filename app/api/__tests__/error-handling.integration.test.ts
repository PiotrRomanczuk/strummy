/**
 * Integration tests: API error handling across assignment handlers
 *
 * Verifies that handlers return correct HTTP status codes and error
 * messages when the database layer or validation checks fail.
 */
import {
  createMockQueryBuilder,
  createMockAuthContext,
  MOCK_DATA_IDS,
} from '@/lib/testing/integration-helpers';

jest.mock('@/lib/services/notification-service', () => ({
  queueNotification: jest.fn().mockResolvedValue(undefined),
}));

/* ---------- Handlers under test ---------- */
import { getAssignmentsHandler, createAssignmentHandler } from '@/app/api/(curriculum)/assignments/handlers';
import {
  getAssignmentHandler,
  deleteAssignmentHandler,
} from '@/app/api/(curriculum)/assignments/[id]/handlers';

/* ---------- Helpers ---------- */
const adminCtx = createMockAuthContext('admin');

function buildSupabase(
  queryBuilder: ReturnType<typeof createMockQueryBuilder>,
  profileBuilder?: ReturnType<typeof createMockQueryBuilder>
) {
  const pb = profileBuilder ?? createMockQueryBuilder(adminCtx.profile);
  return {
    from: jest.fn((table: string) => {
      if (table === 'profiles') return pb;
      return queryBuilder;
    }),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: adminCtx.user }, error: null }),
    },
  };
}

/* ========================================================== */
describe('API error-handling integration', () => {
  /* -------------------------------------------------------- */
  it('getAssignmentsHandler returns 500 when Supabase query fails', async () => {
    const qb = createMockQueryBuilder(null, { message: 'DB error' });
    const supabase = buildSupabase(qb);

    const result = await getAssignmentsHandler(
      supabase as never,
      adminCtx.userId,
      adminCtx.profileMapped,
      {}
    );

    expect(result.status).toBe(500);
    expect(result.error).toBe('Failed to fetch assignments');
  });

  /* -------------------------------------------------------- */
  it('createAssignmentHandler returns 400 when student not found (verifyStudent fails)', async () => {
    // profiles query returns null with error -> student not found
    const profileBuilder = createMockQueryBuilder(null, { message: 'not found' });
    const assignmentBuilder = createMockQueryBuilder([]);
    const supabase = buildSupabase(assignmentBuilder, profileBuilder);

    const input = {
      title: 'Practice scales',
      teacher_id: adminCtx.userId,
      student_id: MOCK_DATA_IDS.student,
    };

    const result = await createAssignmentHandler(
      supabase as never,
      adminCtx.userId,
      adminCtx.profileMapped,
      input
    );

    expect(result.status).toBe(400);
    expect(result.error).toBe('Student not found');
  });

  /* -------------------------------------------------------- */
  it('createAssignmentHandler returns 400 when lesson does not match teacher/student', async () => {
    // profiles query succeeds (student found with is_student: true)
    const studentProfile = { id: MOCK_DATA_IDS.student, is_student: true };
    const profileBuilder = createMockQueryBuilder(studentProfile);

    // lessons query returns a lesson with mismatched teacher_id
    const mismatchedLesson = {
      id: MOCK_DATA_IDS.lesson,
      teacher_id: '00000000-0000-0000-0000-999999999999', // different teacher
      student_id: MOCK_DATA_IDS.student,
    };

    // Route 'profiles' to profileBuilder, 'lessons' to lessonBuilder, else assignmentBuilder
    const lessonBuilder = createMockQueryBuilder(mismatchedLesson);
    const assignmentBuilder = createMockQueryBuilder([]);

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'profiles') return profileBuilder;
        if (table === 'lessons') return lessonBuilder;
        return assignmentBuilder;
      }),
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: adminCtx.user }, error: null }),
      },
    };

    const input = {
      title: 'Practice scales',
      teacher_id: adminCtx.userId,
      student_id: MOCK_DATA_IDS.student,
      lesson_id: MOCK_DATA_IDS.lesson,
    };

    const result = await createAssignmentHandler(
      supabase as never,
      adminCtx.userId,
      adminCtx.profileMapped,
      input
    );

    expect(result.status).toBe(400);
    expect(result.error).toBe('Lesson does not match specified teacher and student');
  });

  /* -------------------------------------------------------- */
  it('getAssignmentHandler returns 404 when assignment not found', async () => {
    const qb = createMockQueryBuilder(null, { message: 'not found' });
    const supabase = buildSupabase(qb);

    const result = await getAssignmentHandler(
      supabase as never,
      MOCK_DATA_IDS.assignment,
      adminCtx.userId,
      adminCtx.profileMapped
    );

    expect(result.status).toBe(404);
    expect(result.error).toBe('Assignment not found');
  });

  /* -------------------------------------------------------- */
  it('deleteAssignmentHandler returns 404 when assignment not found', async () => {
    const qb = createMockQueryBuilder(null, { message: 'not found' });
    const supabase = buildSupabase(qb);

    const result = await deleteAssignmentHandler(
      supabase as never,
      MOCK_DATA_IDS.assignment,
      adminCtx.userId,
      adminCtx.profileMapped
    );

    expect(result.status).toBe(404);
    expect(result.error).toBe('Assignment not found');
  });
});
