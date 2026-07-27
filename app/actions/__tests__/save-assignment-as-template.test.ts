/**
 * saveAssignmentAsTemplate Server Action Tests
 *
 * Reads a source assignment (RLS-scoped) and copies its title / brief /
 * checklist into a new assignment_template. Powers both the detail-page
 * "Save as template" button and the create form's "also save as template".
 *
 * @see app/actions/assignment-templates.ts
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { saveAssignmentAsTemplate } from '../assignment-templates';

const mockGetUserWithRolesSSR = jest.fn();
jest.mock('@/lib/getUserWithRolesSSR', () => ({
  getUserWithRolesSSR: () => mockGetUserWithRolesSSR(),
}));

// Read (assignments): select -> eq -> is -> single
// Insert (assignment_templates): insert -> select -> single
const mockFrom = jest.fn();
const mockInsert = jest.fn();
const mockReadSingle = jest.fn();
const mockInsertSingle = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      from: (table: string) => {
        mockFrom(table);
        return {
          select: () => ({
            eq: () => ({
              is: () => ({ single: () => mockReadSingle() }),
            }),
          }),
          insert: (data: unknown) => {
            mockInsert(data);
            return { select: () => ({ single: () => mockInsertSingle() }) };
          },
        };
      },
    })
  ),
}));

const mockRevalidatePath = jest.fn();
jest.mock('next/cache', () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}));

const mockLogError = jest.fn();
jest.mock('@/lib/logger', () => ({
  logger: {
    error: (...args: unknown[]) => mockLogError(...args),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

const TEACHER_ID = '123e4567-e89b-12d3-a456-426614174000';
const ADMIN_ID = '223e4567-e89b-12d3-a456-426614174001';
const STUDENT_ID = '323e4567-e89b-12d3-a456-426614174002';
const ASSIGNMENT_ID = '999e4567-e89b-12d3-a456-426614174099';
const NEW_TEMPLATE_ID = '777e4567-e89b-12d3-a456-426614174077';

const asTeacher = () =>
  mockGetUserWithRolesSSR.mockResolvedValue({
    user: { id: TEACHER_ID },
    isAdmin: false,
    isTeacher: true,
    isStudent: false,
    isDevelopment: false,
  });

describe('saveAssignmentAsTemplate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadSingle.mockResolvedValue({
      data: { title: 'Weekly scales', description: 'Practice C major', checklist: [] },
      error: null,
    });
    mockInsertSingle.mockResolvedValue({ data: { id: NEW_TEMPLATE_ID }, error: null });
  });

  it('copies title, brief and checklist into a template for a teacher', async () => {
    asTeacher();
    mockReadSingle.mockResolvedValue({
      data: {
        title: 'Weekly scales',
        description: 'Practice C major',
        checklist: [{ id: 'a', text: 'C major', done: true }],
      },
      error: null,
    });

    const result = await saveAssignmentAsTemplate(ASSIGNMENT_ID);

    expect(mockFrom).toHaveBeenNthCalledWith(1, 'assignments');
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'assignment_templates');
    // done is reset to false — a template seeds fresh work.
    expect(mockInsert).toHaveBeenCalledWith({
      title: 'Weekly scales',
      description: 'Practice C major',
      teacher_id: TEACHER_ID,
      checklist: [{ id: 'a', text: 'C major', done: false }],
    });
    expect(result).toEqual({ templateId: NEW_TEMPLATE_ID });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard/assignments/templates');
  });

  it('forces teacher_id to the current user (admin saving any assignment)', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue({
      user: { id: ADMIN_ID },
      isAdmin: true,
      isTeacher: false,
      isStudent: false,
      isDevelopment: false,
    });

    await saveAssignmentAsTemplate(ASSIGNMENT_ID);

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ teacher_id: ADMIN_ID }));
  });

  it('rejects a student before any DB access', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue({
      user: { id: STUDENT_ID },
      isAdmin: false,
      isTeacher: false,
      isStudent: true,
      isDevelopment: false,
    });

    await expect(saveAssignmentAsTemplate(ASSIGNMENT_ID)).rejects.toThrow('Unauthorized');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated user', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue({
      user: null,
      isAdmin: false,
      isTeacher: false,
      isStudent: false,
      isDevelopment: false,
    });

    await expect(saveAssignmentAsTemplate(ASSIGNMENT_ID)).rejects.toThrow('Unauthorized');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('rejects demo/test accounts before touching the database', async () => {
    mockGetUserWithRolesSSR.mockResolvedValue({
      user: { id: TEACHER_ID },
      isAdmin: false,
      isTeacher: true,
      isStudent: false,
      isDevelopment: true,
    });

    await expect(saveAssignmentAsTemplate(ASSIGNMENT_ID)).rejects.toThrow(
      'This action is not available on test accounts'
    );
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('throws "Assignment not found" and does not insert when the read fails', async () => {
    asTeacher();
    mockReadSingle.mockResolvedValue({ data: null, error: { message: 'no rows' } });

    await expect(saveAssignmentAsTemplate(ASSIGNMENT_ID)).rejects.toThrow('Assignment not found');
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('throws a generic error and logs when the template insert fails', async () => {
    asTeacher();
    const dbError = { message: 'insert failed' };
    mockInsertSingle.mockResolvedValue({ data: null, error: dbError });

    await expect(saveAssignmentAsTemplate(ASSIGNMENT_ID)).rejects.toThrow(
      'Failed to save template'
    );
    expect(mockLogError).toHaveBeenCalledWith('Error saving assignment as template:', dbError);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
