/**
 * Integration tests: full assignment CRUD flow
 *
 * Exercises every exported handler from the assignments API through
 * create, read, update, and delete scenarios with role-based access control.
 */
import {
  createMockQueryBuilder,
  createMockAuthContext,
  MOCK_DATA_IDS,
} from '@/lib/testing/integration-helpers';

jest.mock('@/lib/services/notification-service', () => ({
  queueNotification: jest.fn().mockResolvedValue(undefined),
}));

import { getAssignmentsHandler, createAssignmentHandler } from '@/app/api/(curriculum)/assignments/handlers';
import {
  getAssignmentHandler,
  updateAssignmentHandler,
  deleteAssignmentHandler,
} from '@/app/api/(curriculum)/assignments/[id]/handlers';

/* ---------- Constants ---------- */
const teacherCtx = createMockAuthContext('teacher');
const adminCtx = createMockAuthContext('admin');
const studentCtx = createMockAuthContext('student');

const SAMPLE_ASSIGNMENT = {
  id: MOCK_DATA_IDS.assignment,
  title: 'Practice chord transitions',
  description: 'Work on G to C transitions',
  due_date: '2026-03-01T00:00:00.000Z',
  teacher_id: teacherCtx.userId,
  student_id: studentCtx.userId,
  lesson_id: MOCK_DATA_IDS.lesson,
  status: 'not_started',
  deleted_at: null,
  created_at: '2026-02-01T00:00:00.000Z',
  updated_at: '2026-02-01T00:00:00.000Z',
  teacher_profile: { id: teacherCtx.userId, email: teacherCtx.email, full_name: 'Teacher' },
  student_profile: { id: studentCtx.userId, email: studentCtx.email, full_name: 'Student' },
  lesson: { id: MOCK_DATA_IDS.lesson, lesson_number: 1, scheduled_at: '2026-02-15T10:00:00Z' },
};

/* ---------- Helpers ---------- */

/**
 * Build a basic supabase mock that returns the given data for all
 * non-profile tables and the admin profile for profiles.
 */
function buildSimpleSupabase(
  data: unknown = [],
  error: unknown = null
) {
  const qb = createMockQueryBuilder(data, error);
  const pb = createMockQueryBuilder(adminCtx.profile);
  return {
    client: {
      from: jest.fn((table: string) => {
        if (table === 'profiles') return pb;
        return qb;
      }),
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: adminCtx.user }, error: null }),
      },
    },
    qb,
    pb,
  };
}

/* ========================================================== */
describe('Assignment CRUD integration', () => {
  /* -------------------------------------------------------- */
  describe('GET /api/assignments (list)', () => {
    it('admin can list all assignments', async () => {
      const assignments = [SAMPLE_ASSIGNMENT];
      const qb = createMockQueryBuilder(assignments);
      const supabase = {
        from: jest.fn(() => qb),
      };

      const result = await getAssignmentsHandler(
        supabase as never,
        adminCtx.userId,
        adminCtx.profileMapped,
        {}
      );

      expect(result.status).toBe(200);
      expect(result).toHaveProperty('assignments');
      expect(supabase.from).toHaveBeenCalledWith('assignments');
    });
  });

  /* -------------------------------------------------------- */
  describe('POST /api/assignments (create)', () => {
    it('teacher can create an assignment', async () => {
      // Need separate builders for profiles (verifyStudent) and assignments (insert)
      const studentProfile = { id: studentCtx.userId, is_student: true };
      const profileBuilder = createMockQueryBuilder(studentProfile);
      const assignmentBuilder = createMockQueryBuilder(SAMPLE_ASSIGNMENT);

      const supabase = {
        from: jest.fn((table: string) => {
          if (table === 'profiles') return profileBuilder;
          return assignmentBuilder;
        }),
      };

      const input = {
        title: 'Practice chord transitions',
        description: 'Work on G to C transitions',
        due_date: '2026-03-01T00:00:00.000Z',
        teacher_id: teacherCtx.userId,
        student_id: studentCtx.userId,
      };

      const result = await createAssignmentHandler(
        supabase as never,
        teacherCtx.userId,
        teacherCtx.profileMapped,
        input
      );

      expect(result.status).toBe(201);
      expect(result).toHaveProperty('assignment');
      // Verify insert was called on the assignments builder
      expect(assignmentBuilder.insert).toHaveBeenCalled();
    });

    it('student cannot create an assignment (403)', async () => {
      const { client } = buildSimpleSupabase();

      const input = {
        title: 'Sneaky assignment',
        teacher_id: teacherCtx.userId,
        student_id: studentCtx.userId,
      };

      const result = await createAssignmentHandler(
        client as never,
        studentCtx.userId,
        studentCtx.profileMapped,
        input
      );

      expect(result.status).toBe(403);
      expect(result.error).toBe('Only teachers and admins can create assignments');
    });
  });

  /* -------------------------------------------------------- */
  describe('GET /api/assignments/:id (single)', () => {
    it('returns assignment data for authorised user', async () => {
      const qb = createMockQueryBuilder(SAMPLE_ASSIGNMENT);
      const supabase = {
        from: jest.fn(() => qb),
      };

      const result = await getAssignmentHandler(
        supabase as never,
        MOCK_DATA_IDS.assignment,
        teacherCtx.userId,
        teacherCtx.profileMapped
      );

      expect(result.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data!.title).toBe('Practice chord transitions');
    });
  });

  /* -------------------------------------------------------- */
  describe('PUT /api/assignments/:id (update)', () => {
    it('teacher can update their own assignment', async () => {
      // First call: fetch existing assignment; second call: update
      // Both go through the same query builder chain
      const existingAssignment = {
        ...SAMPLE_ASSIGNMENT,
        teacher_id: teacherCtx.userId,
        student_id: studentCtx.userId,
      };
      const updatedAssignment = {
        ...existingAssignment,
        title: 'Updated title',
      };

      // The handler calls supabase.from('assignments') twice:
      //   1) .select('*').eq('id', ...).is('deleted_at', null).single()  -> fetch existing
      //   2) .update(...).eq('id', ...).select(...).single()              -> perform update
      // Both share the same builder via from('assignments').
      // The single() mock will be called twice -- we chain resolved values.
      const qb = createMockQueryBuilder(existingAssignment);
      // Override single to return existing on first call, updated on second
      qb.single
        .mockResolvedValueOnce({ data: existingAssignment, error: null })
        .mockResolvedValueOnce({ data: updatedAssignment, error: null });

      const supabase = {
        from: jest.fn(() => qb),
      };

      const input = { id: MOCK_DATA_IDS.assignment, title: 'Updated title' };
      const body = { title: 'Updated title' };

      const result = await updateAssignmentHandler(
        supabase as never,
        MOCK_DATA_IDS.assignment,
        teacherCtx.userId,
        teacherCtx.profileMapped,
        input,
        body
      );

      expect(result.status).toBe(200);
      expect(result.data).toBeDefined();
      expect(result.data!.title).toBe('Updated title');
    });
  });

  /* -------------------------------------------------------- */
  describe('DELETE /api/assignments/:id', () => {
    it('teacher can delete their own assignment', async () => {
      const existingAssignment = {
        teacher_id: teacherCtx.userId,
      };

      const qb = createMockQueryBuilder(existingAssignment);
      // single() for fetch, then the update (soft delete) resolves via then()
      qb.single.mockResolvedValueOnce({ data: existingAssignment, error: null });

      const supabase = {
        from: jest.fn(() => qb),
      };

      const result = await deleteAssignmentHandler(
        supabase as never,
        MOCK_DATA_IDS.assignment,
        teacherCtx.userId,
        teacherCtx.profileMapped
      );

      expect(result.status).toBe(200);
      expect(result.data).toEqual({ message: 'Assignment deleted successfully' });
    });

    it('different teacher cannot delete another teacher\'s assignment (403)', async () => {
      const existingAssignment = {
        teacher_id: '00000000-0000-0000-0000-999999999999', // different teacher
      };

      const qb = createMockQueryBuilder(existingAssignment);
      qb.single.mockResolvedValueOnce({ data: existingAssignment, error: null });

      const supabase = {
        from: jest.fn(() => qb),
      };

      const result = await deleteAssignmentHandler(
        supabase as never,
        MOCK_DATA_IDS.assignment,
        teacherCtx.userId,
        teacherCtx.profileMapped
      );

      expect(result.status).toBe(403);
      expect(result.error).toBe(
        'Only admins and the assignment creator can delete assignments'
      );
    });
  });
});
