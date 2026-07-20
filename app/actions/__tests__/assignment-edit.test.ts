/**
 * Create/update assignment server-action tests.
 *
 * Mirrors app/actions/__tests__/assignment-checklist.test.ts. Verifies role
 * guards, teacher-id ownership rules, Zod validation (driven with real
 * schemas), payload normalization (dates, null coalescing), Supabase error
 * handling, and best-effort student notification.
 *
 * @see app/actions/assignment-edit.ts
 */

import {
  createAssignmentAction,
  updateAssignmentAction,
  type AssignmentFormValues,
} from '../assignment-edit';

const mockGetUserWithRolesSSR = jest.fn();
jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: () => mockGetUserWithRolesSSR(),
}));

const mockInsertSingle = jest.fn();
const mockUpdateSingle = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      from: () => ({
        insert: (payload: unknown) => {
          mockInsert(payload);
          return { select: () => ({ single: () => mockInsertSingle() }) };
        },
        update: (payload: unknown) => {
          mockUpdate(payload);
          return {
            eq: () => ({ is: () => ({ select: () => ({ single: () => mockUpdateSingle() }) }) }),
          };
        },
      }),
    })
  ),
}));

const mockQueueNotification = jest.fn();
jest.mock('@/lib/services/notification-service', () => ({
  queueNotification: (payload: unknown) => mockQueueNotification(payload),
}));

const mockRevalidatePath = jest.fn();
jest.mock('next/cache', () => ({ revalidatePath: (p: string) => mockRevalidatePath(p) }));

const mockLogError = jest.fn();
// createLogger runs at the module's import time — resolve the spy lazily so
// jest.mock hoisting doesn't hit the const in its temporal dead zone.
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    error: (...args: unknown[]) => mockLogError(...args),
    warn: jest.fn(),
    info: jest.fn(),
  }),
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
}));

const TEACHER_ID = '223e4567-e89b-12d3-a456-426614174111';
const OTHER_TEACHER_ID = '333e4567-e89b-12d3-a456-426614174222';
const STUDENT_ID = '123e4567-e89b-12d3-a456-426614174000';
const ASSIGNMENT_ID = '423e4567-e89b-12d3-a456-426614174333';
const SONG_ID = '523e4567-e89b-12d3-a456-426614174444';
const LESSON_ID = '623e4567-e89b-12d3-a456-426614174555';

const asTeacher = {
  user: { id: TEACHER_ID },
  isAdmin: false,
  isTeacher: true,
  isStudent: false,
  isDevelopment: false,
};
const asAdmin = { ...asTeacher, isAdmin: true, isTeacher: false };
const asStudent = { ...asTeacher, isTeacher: false, isStudent: true };

const validValues: AssignmentFormValues = {
  studentId: STUDENT_ID,
  title: 'Practise the C–Am–F–G loop',
};

const insertedRow = {
  id: ASSIGNMENT_ID,
  title: validValues.title,
  due_date: null,
  student_id: STUDENT_ID,
};

describe('createAssignmentAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserWithRolesSSR.mockResolvedValue(asTeacher);
    mockInsertSingle.mockResolvedValue({ data: insertedRow, error: null });
    mockQueueNotification.mockResolvedValue(undefined);
  });

  it('blocks demo/test accounts', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue({ ...asTeacher, isDevelopment: true });
    const result = await createAssignmentAction(validValues);
    expect(result).toHaveProperty('error');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated callers', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue({ ...asTeacher, user: null });
    expect(await createAssignmentAction(validValues)).toEqual({ error: 'Unauthorized' });
  });

  it('rejects students', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue(asStudent);
    expect(await createAssignmentAction(validValues)).toEqual({
      error: 'Only teachers and admins can create assignments',
    });
  });

  it('rejects a teacher creating for another teacher', async () => {
    const result = await createAssignmentAction({ ...validValues, teacherId: OTHER_TEACHER_ID });
    expect(result).toEqual({ error: 'Teachers can only create assignments for themselves' });
  });

  it('allows a teacher passing their own teacherId explicitly', async () => {
    const result = await createAssignmentAction({ ...validValues, teacherId: TEACHER_ID });
    expect(result).toEqual({ assignmentId: ASSIGNMENT_ID });
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ teacher_id: TEACHER_ID }));
  });

  it('lets an admin assign on behalf of another teacher', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue(asAdmin);
    await createAssignmentAction({ ...validValues, teacherId: OTHER_TEACHER_ID });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ teacher_id: OTHER_TEACHER_ID })
    );
  });

  it('defaults teacher_id to the admin themselves when none given', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue(asAdmin);
    await createAssignmentAction(validValues);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ teacher_id: TEACHER_ID }));
  });

  it('returns Zod messages for an invalid payload', async () => {
    const result = await createAssignmentAction({ ...validValues, title: '' });
    expect(result).toEqual({ error: expect.stringContaining('Title is required') });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('normalizes optional fields: valid date to ISO, empty strings dropped', async () => {
    await createAssignmentAction({
      ...validValues,
      description: 'Slow first',
      dueDate: '2026-08-01',
      songId: SONG_ID,
      lessonId: LESSON_ID,
      checklist: [{ id: 'a', text: 'Bar 1', done: false }],
    });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Slow first',
        due_date: new Date('2026-08-01').toISOString(),
        song_id: SONG_ID,
        lesson_id: LESSON_ID,
        checklist: [{ id: 'a', text: 'Bar 1', done: false }],
      })
    );
  });

  it('drops an unparseable due date and empty description/song/lesson', async () => {
    await createAssignmentAction({
      ...validValues,
      description: '',
      dueDate: 'not-a-date',
      songId: '',
      lessonId: '',
    });
    const payload = mockInsert.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.due_date).toBeUndefined();
    expect(payload.description).toBeUndefined();
    expect(payload.song_id).toBeNull();
    expect(payload.lesson_id).toBeNull();
  });

  it('surfaces insert errors and logs them', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: { message: 'insert exploded' } });
    expect(await createAssignmentAction(validValues)).toEqual({ error: 'insert exploded' });
    expect(mockLogError).toHaveBeenCalled();
  });

  it('falls back to a generic message when insert returns no row and no error', async () => {
    mockInsertSingle.mockResolvedValue({ data: null, error: null });
    expect(await createAssignmentAction(validValues)).toEqual({
      error: 'Failed to create assignment',
    });
  });

  it('queues an in-app notification with the assignment link', async () => {
    const prevAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    process.env.NEXT_PUBLIC_APP_URL = 'https://strummy.test';
    try {
      await createAssignmentAction(validValues);
      expect(mockQueueNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'assignment_created',
          recipientUserId: STUDENT_ID,
          templateData: expect.objectContaining({
            assignmentLink: `https://strummy.test/dashboard/assignments/${ASSIGNMENT_ID}`,
          }),
        })
      );
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = prevAppUrl;
    }
  });

  it('falls back through NEXT_PUBLIC_API_BASE_URL_REMOTE to empty base URL', async () => {
    const prevAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    const prevRemote = process.env.NEXT_PUBLIC_API_BASE_URL_REMOTE;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_API_BASE_URL_REMOTE;
    try {
      await createAssignmentAction(validValues);
      expect(mockQueueNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          templateData: expect.objectContaining({
            assignmentLink: `/dashboard/assignments/${ASSIGNMENT_ID}`,
          }),
        })
      );
    } finally {
      process.env.NEXT_PUBLIC_APP_URL = prevAppUrl;
      process.env.NEXT_PUBLIC_API_BASE_URL_REMOTE = prevRemote;
    }
  });

  it('never fails the action when notification queueing throws', async () => {
    mockQueueNotification.mockRejectedValue(new Error('queue down'));
    expect(await createAssignmentAction(validValues)).toEqual({ assignmentId: ASSIGNMENT_ID });
    expect(mockLogError).toHaveBeenCalled();
  });

  it('revalidates the assignments list on success', async () => {
    await createAssignmentAction(validValues);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/assignments');
  });
});

describe('updateAssignmentAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserWithRolesSSR.mockResolvedValue(asTeacher);
    mockUpdateSingle.mockResolvedValue({ data: { id: ASSIGNMENT_ID }, error: null });
  });

  it('blocks demo/test accounts', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue({ ...asTeacher, isDevelopment: true });
    const result = await updateAssignmentAction(ASSIGNMENT_ID, validValues);
    expect(result).toHaveProperty('error');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated callers', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue({ ...asTeacher, user: null });
    expect(await updateAssignmentAction(ASSIGNMENT_ID, validValues)).toEqual({
      error: 'Unauthorized',
    });
  });

  it('rejects students', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue(asStudent);
    expect(await updateAssignmentAction(ASSIGNMENT_ID, validValues)).toEqual({
      error: 'Only teachers and admins can update assignments',
    });
  });

  it('nulls cleared optional fields and stamps updated_at', async () => {
    await updateAssignmentAction(ASSIGNMENT_ID, {
      ...validValues,
      description: '',
      dueDate: undefined,
      songId: null,
      lessonId: null,
    });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        description: null,
        due_date: null,
        song_id: null,
        lesson_id: null,
        updated_at: expect.any(String),
      })
    );
    const payload = mockUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('checklist');
  });

  it('persists a provided valid checklist', async () => {
    await updateAssignmentAction(ASSIGNMENT_ID, {
      ...validValues,
      dueDate: '2026-08-01',
      checklist: [{ id: 'a', text: 'Bar 1', done: true }],
    });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        due_date: new Date('2026-08-01').toISOString(),
        checklist: [{ id: 'a', text: 'Bar 1', done: true }],
      })
    );
  });

  it('rejects a malformed checklist', async () => {
    const badChecklist = [{ id: 'a', text: '', done: false }];
    expect(
      await updateAssignmentAction(ASSIGNMENT_ID, { ...validValues, checklist: badChecklist })
    ).toEqual({ error: 'Invalid checklist' });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('maps PGRST116 to a not-found error', async () => {
    mockUpdateSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'no rows' },
    });
    expect(await updateAssignmentAction(ASSIGNMENT_ID, validValues)).toEqual({
      error: 'Assignment not found',
    });
  });

  it('surfaces other update errors and logs them', async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: { message: 'update exploded' } });
    expect(await updateAssignmentAction(ASSIGNMENT_ID, validValues)).toEqual({
      error: 'update exploded',
    });
    expect(mockLogError).toHaveBeenCalled();
  });

  it('falls back to a generic message when update returns no row and no error', async () => {
    mockUpdateSingle.mockResolvedValue({ data: null, error: null });
    expect(await updateAssignmentAction(ASSIGNMENT_ID, validValues)).toEqual({
      error: 'Failed to update assignment',
    });
  });

  it('revalidates list and detail on success', async () => {
    expect(await updateAssignmentAction(ASSIGNMENT_ID, validValues)).toEqual({
      assignmentId: ASSIGNMENT_ID,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/assignments');
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/dashboard/assignments/${ASSIGNMENT_ID}`);
  });
});
