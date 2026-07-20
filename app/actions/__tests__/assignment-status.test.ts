/**
 * Status-transition server-action tests.
 *
 * Verifies the write-path split (owning student → SECURITY DEFINER RPC,
 * teacher/admin → plain update), ownership guards, the student target
 * whitelist, and state-machine validation via the real schema helper.
 *
 * @see app/actions/assignment-status.ts
 */

import { updateAssignmentStatusAction } from '../assignment-status';

// Delegates to the real state machine unless a test injects an override —
// only the defensive fallback branch needs one.
let validateOverride: { valid: boolean; error?: string } | null = null;
jest.mock('@/schemas/AssignmentSchema', () => {
  const actual = jest.requireActual('@/schemas/AssignmentSchema');
  return {
    ...actual,
    validateStatusTransition: (cur: string, next: string) =>
      validateOverride ?? actual.validateStatusTransition(cur, next),
  };
});

const mockGetUserWithRolesSSR = jest.fn();
jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: () => mockGetUserWithRolesSSR(),
}));

const mockSingle = jest.fn();
const mockRpc = jest.fn();
const mockUpdate = jest.fn();
const mockUpdateResult = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      from: () => ({
        select: () => ({ eq: () => ({ is: () => ({ single: () => mockSingle() }) }) }),
        update: (payload: unknown) => {
          mockUpdate(payload);
          return { eq: () => mockUpdateResult() };
        },
      }),
      rpc: (name: string, args: unknown) => {
        mockRpc(name, args);
        return mockUpdateResult();
      },
    })
  ),
}));

const mockRevalidatePath = jest.fn();
jest.mock('next/cache', () => ({ revalidatePath: (p: string) => mockRevalidatePath(p) }));

const mockLogError = jest.fn();
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    error: (...args: unknown[]) => mockLogError(...args),
    warn: jest.fn(),
    info: jest.fn(),
  }),
}));

const STUDENT_ID = '123e4567-e89b-12d3-a456-426614174000';
const TEACHER_ID = '223e4567-e89b-12d3-a456-426614174111';
const OTHER_ID = '333e4567-e89b-12d3-a456-426614174222';
const ASSIGNMENT_ID = '423e4567-e89b-12d3-a456-426614174333';

const baseRoles = {
  isAdmin: false,
  isTeacher: false,
  isStudent: false,
  isDevelopment: false,
};
const asOwningStudent = { ...baseRoles, user: { id: STUDENT_ID }, isStudent: true };
const asOwningTeacher = { ...baseRoles, user: { id: TEACHER_ID }, isTeacher: true };
const asAdmin = { ...baseRoles, user: { id: OTHER_ID }, isAdmin: true };

const assignmentRow = {
  id: ASSIGNMENT_ID,
  teacher_id: TEACHER_ID,
  student_id: STUDENT_ID,
  status: 'not_started',
};

describe('updateAssignmentStatusAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    validateOverride = null;
    mockGetUserWithRolesSSR.mockResolvedValue(asOwningStudent);
    mockSingle.mockResolvedValue({ data: assignmentRow, error: null });
    mockUpdateResult.mockResolvedValue({ error: null });
  });

  it('blocks demo/test accounts', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue({ ...asOwningStudent, isDevelopment: true });
    const result = await updateAssignmentStatusAction(ASSIGNMENT_ID, 'in_progress');
    expect(result).toHaveProperty('error');
    expect(mockSingle).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated callers', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue({ ...baseRoles, user: null });
    expect(await updateAssignmentStatusAction(ASSIGNMENT_ID, 'in_progress')).toEqual({
      error: 'Unauthorized',
    });
  });

  it('returns not-found on fetch error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'nope' } });
    expect(await updateAssignmentStatusAction(ASSIGNMENT_ID, 'in_progress')).toEqual({
      error: 'Assignment not found',
    });
  });

  it('returns not-found when the row is missing without an error', async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });
    expect(await updateAssignmentStatusAction(ASSIGNMENT_ID, 'in_progress')).toEqual({
      error: 'Assignment not found',
    });
  });

  it('rejects an unrelated student', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue({
      ...asOwningStudent,
      user: { id: OTHER_ID },
    });
    expect(await updateAssignmentStatusAction(ASSIGNMENT_ID, 'in_progress')).toEqual({
      error: 'You cannot change this assignment',
    });
  });

  it('rejects an unrelated teacher', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue({
      ...asOwningTeacher,
      user: { id: OTHER_ID },
    });
    expect(await updateAssignmentStatusAction(ASSIGNMENT_ID, 'in_progress')).toEqual({
      error: 'You cannot change this assignment',
    });
  });

  it('limits students to start/complete', async () => {
    expect(await updateAssignmentStatusAction(ASSIGNMENT_ID, 'cancelled')).toEqual({
      error: 'Students can only start or complete an assignment',
    });
  });

  it('rejects an invalid state transition with the machine error', async () => {
    // completed is terminal — reopening it is not a legal transition.
    mockSingle.mockResolvedValue({
      data: { ...assignmentRow, status: 'completed' },
      error: null,
    });
    mockGetUserWithRolesSSR.mockResolvedValue(asOwningTeacher);
    const result = await updateAssignmentStatusAction(ASSIGNMENT_ID, 'in_progress');
    expect(result).toHaveProperty('error');
    expect(mockRpc).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('falls back to a generic message if the validator omits an error', async () => {
    // Defensive branch: validateStatusTransition always sets `error` today,
    // but the action must not crash if that contract loosens.
    mockGetUserWithRolesSSR.mockResolvedValue(asOwningTeacher);
    validateOverride = { valid: false };
    expect(await updateAssignmentStatusAction(ASSIGNMENT_ID, 'in_progress')).toEqual({
      error: 'Invalid status transition',
    });
  });

  it('routes an owning student through the SECURITY DEFINER RPC', async () => {
    const result = await updateAssignmentStatusAction(ASSIGNMENT_ID, 'in_progress');
    expect(result).toEqual({ success: true, newStatus: 'in_progress' });
    expect(mockRpc).toHaveBeenCalledWith('student_update_assignment_status', {
      p_assignment_id: ASSIGNMENT_ID,
      p_new_status: 'in_progress',
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('routes an owning teacher through a plain update', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue(asOwningTeacher);
    const result = await updateAssignmentStatusAction(ASSIGNMENT_ID, 'cancelled');
    expect(result).toEqual({ success: true, newStatus: 'cancelled' });
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'cancelled' });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('routes an admin through a plain update even for another teacher', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue(asAdmin);
    const result = await updateAssignmentStatusAction(ASSIGNMENT_ID, 'in_progress');
    expect(result).toEqual({ success: true, newStatus: 'in_progress' });
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'in_progress' });
  });

  it('surfaces write failures with a generic message and logs details', async () => {
    mockUpdateResult.mockResolvedValue({ error: { message: 'rpc exploded' } });
    expect(await updateAssignmentStatusAction(ASSIGNMENT_ID, 'in_progress')).toEqual({
      error: 'Failed to update assignment status',
    });
    expect(mockLogError).toHaveBeenCalled();
  });

  it('revalidates list and detail on success', async () => {
    await updateAssignmentStatusAction(ASSIGNMENT_ID, 'in_progress');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/assignments');
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/dashboard/assignments/${ASSIGNMENT_ID}`);
  });
});
