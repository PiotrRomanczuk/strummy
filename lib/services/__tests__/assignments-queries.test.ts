/**
 * Assignments list query tests: role scoping, filter plumbing, row mapping
 * (joined student array vs object, checklist parsing, effective status), and
 * error fallback. Uses the real list-params helpers and schemas.
 *
 * @see lib/services/assignments-queries.ts
 */

import {
  assignmentStatusColour,
  assignmentStatusLabel,
  getAssignmentsList,
} from '../assignments-queries';
import { parseAssignmentListParams } from '../assignment-list-params';

const mockLimit = jest.fn();
const mockEqField = jest.fn();
const mockEqStudent = jest.fn();
const mockIlike = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => {
    const chain = {
      eq: (field: string, value: string) => {
        (chain as { _eqCount?: number })._eqCount =
          ((chain as { _eqCount?: number })._eqCount ?? 0) + 1;
        if ((chain as { _eqCount?: number })._eqCount === 1) mockEqField(field, value);
        else mockEqStudent(field, value);
        return chain;
      },
      is: () => chain,
      ilike: (field: string, pattern: string) => {
        mockIlike(field, pattern);
        return chain;
      },
      limit: () => mockLimit(),
    };
    return Promise.resolve({
      from: () => ({ select: () => chain }),
    });
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const TEACHER_ID = '223e4567-e89b-12d3-a456-426614174111';
const STUDENT_ID = '123e4567-e89b-12d3-a456-426614174000';

const defaultParams = parseAssignmentListParams({});

const rawRow = {
  id: 'a1',
  title: 'Clean up timing',
  status: 'not_started',
  due_date: null,
  teacher_id: TEACHER_ID,
  student_id: STUDENT_ID,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-02T00:00:00Z',
  checklist: [{ id: 'a', text: 'Bar 1', done: true }],
  student: { full_name: 'Kai Andersen', email: 'kai@example.test' },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-07-20T12:00:00Z'));
});

afterEach(() => jest.useRealTimers());

describe('status label/colour helpers', () => {
  it('maps known statuses and falls back for unknown ones', () => {
    expect(assignmentStatusLabel('overdue')).toBe('Overdue');
    expect(assignmentStatusLabel('weird')).toBe('weird');
    expect(assignmentStatusColour('completed')).toBe('var(--success)');
    expect(assignmentStatusColour('weird')).toBe('var(--ink-4)');
  });
});

describe('getAssignmentsList', () => {
  it('scopes by teacher_id for staff and student_id for students', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });
    await getAssignmentsList(TEACHER_ID, false, defaultParams);
    expect(mockEqField).toHaveBeenCalledWith('teacher_id', TEACHER_ID);

    jest.clearAllMocks();
    mockLimit.mockResolvedValue({ data: [], error: null });
    await getAssignmentsList(STUDENT_ID, true, defaultParams);
    expect(mockEqField).toHaveBeenCalledWith('student_id', STUDENT_ID);
  });

  it('applies the teacher-only studentId filter and title search', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });
    await getAssignmentsList(TEACHER_ID, false, {
      ...defaultParams,
      studentId: STUDENT_ID,
      search: 'timing',
    });
    expect(mockEqStudent).toHaveBeenCalledWith('student_id', STUDENT_ID);
    expect(mockIlike).toHaveBeenCalledWith('title', '%timing%');
  });

  it('ignores studentId for student callers', async () => {
    mockLimit.mockResolvedValue({ data: [], error: null });
    await getAssignmentsList(STUDENT_ID, true, { ...defaultParams, studentId: TEACHER_ID });
    expect(mockEqStudent).not.toHaveBeenCalled();
  });

  it('maps rows: joined student object, checklist progress, effective status', async () => {
    mockLimit.mockResolvedValue({
      data: [{ ...rawRow, due_date: '2026-07-11T00:00:00Z' }],
      error: null,
    });
    const { rows, counts } = await getAssignmentsList(TEACHER_ID, false, defaultParams);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 'a1',
      studentName: 'Kai Andersen',
      studentEmail: 'kai@example.test',
      dueDate: '2026-07-11T00:00:00Z',
      effectiveStatus: 'overdue', // past due at the frozen clock
      progress: { done: 1, total: 1 },
      updatedAt: '2026-07-02T00:00:00Z',
    });
    expect(counts.overdue).toBe(1);
  });

  it('handles a joined student ARRAY, missing student, and malformed checklist', async () => {
    mockLimit.mockResolvedValue({
      data: [
        { ...rawRow, id: 'a2', student: [{ full_name: null, email: 'x@y.z' }] },
        { ...rawRow, id: 'a3', student: null, checklist: 'not-a-list', updated_at: null },
      ],
      error: null,
    });
    const { rows } = await getAssignmentsList(TEACHER_ID, false, defaultParams);
    const a2 = rows.find((r) => r.id === 'a2');
    const a3 = rows.find((r) => r.id === 'a3');
    expect(a2).toMatchObject({ studentName: null, studentEmail: 'x@y.z' });
    expect(a3).toMatchObject({
      studentName: null,
      studentEmail: null,
      progress: { done: 0, total: 0 },
      updatedAt: rawRow.created_at, // falls back to created_at
    });
  });

  it('returns empty rows and zero counts on a query error', async () => {
    mockLimit.mockResolvedValue({ data: null, error: { message: 'boom', code: '500' } });
    const result = await getAssignmentsList(TEACHER_ID, false, defaultParams);
    expect(result.rows).toEqual([]);
    expect(Object.values(result.counts).every((n) => n === 0)).toBe(true);
  });

  it('tolerates a null data payload without error', async () => {
    mockLimit.mockResolvedValue({ data: null, error: null });
    const result = await getAssignmentsList(TEACHER_ID, false, defaultParams);
    expect(result.rows).toEqual([]);
  });
});
