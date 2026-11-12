/**
 * Unit tests for the "did this lesson take place" server action.
 *
 * @see app/actions/lesson-attendance.ts
 */

import { confirmLessonAttendance } from '../lesson-attendance';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('@/lib/getUserWithRolesSSR', () => ({ getUserWithRolesSSR: jest.fn() }));
jest.mock('@/lib/auth/test-account-guard', () => ({ guardTestAccountMutation: jest.fn() }));
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }),
}));

const maybeSingle = jest.fn();
const update = jest.fn();
const filters: Array<[string, ...unknown[]]> = [];
const chain: Record<string, unknown> = {};
for (const method of ['eq', 'in', 'lte', 'is', 'select']) {
  chain[method] = (...args: unknown[]) => {
    filters.push([method, ...args]);
    return chain;
  };
}
chain.maybeSingle = maybeSingle;
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: () => ({
      update: (values: unknown) => {
        update(values);
        return chain;
      },
    }),
  })),
}));

const LESSON = '3f2b1c9e-8a47-4d1b-9c55-0a1b2c3d4e5f';
const asRole = (role: Partial<{ isAdmin: boolean; isTeacher: boolean }>) =>
  (getUserWithRolesSSR as jest.Mock).mockResolvedValue({
    user: { id: 'auth-1' },
    isAdmin: false,
    isTeacher: false,
    isDevelopment: false,
    ...role,
  });

beforeEach(() => {
  jest.clearAllMocks();
  filters.length = 0;
  (guardTestAccountMutation as jest.Mock).mockReturnValue(null);
  maybeSingle.mockResolvedValue({ data: { id: LESSON }, error: null });
  asRole({ isTeacher: true });
});

describe('confirmLessonAttendance', () => {
  it('marks a held lesson COMPLETED', async () => {
    await expect(confirmLessonAttendance(LESSON, 'held')).resolves.toEqual({ lessonId: LESSON });
    expect(update).toHaveBeenCalledWith({ status: 'COMPLETED' });
  });

  it('marks a lesson that did not take place CANCELLED', async () => {
    await confirmLessonAttendance(LESSON, 'not_held');
    expect(update).toHaveBeenCalledWith({ status: 'CANCELLED' });
  });

  it('only touches a lesson that is still unconfirmed and has already started', async () => {
    await confirmLessonAttendance(LESSON, 'held');

    expect(filters).toContainEqual(['in', 'status', ['SCHEDULED', 'IN_PROGRESS']]);
    expect(filters).toContainEqual(['lte', 'scheduled_at', expect.any(String)]);
    expect(filters).toContainEqual(['is', 'deleted_at', null]);
  });

  it('reports a lesson that was already answered instead of overwriting it', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(confirmLessonAttendance(LESSON, 'held')).resolves.toEqual({
      error: 'Lesson is not awaiting confirmation',
    });
  });

  it('refuses students', async () => {
    asRole({});

    await expect(confirmLessonAttendance(LESSON, 'held')).resolves.toEqual({
      error: 'Only teachers and admins can confirm lessons',
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses a malformed lesson id before reaching the database', async () => {
    await expect(confirmLessonAttendance('not-a-uuid', 'held')).resolves.toEqual({
      error: 'Invalid request',
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('respects the demo-account guard', async () => {
    (guardTestAccountMutation as jest.Mock).mockReturnValue({
      error: 'Demo accounts are read-only',
    });

    await expect(confirmLessonAttendance(LESSON, 'held')).resolves.toEqual({
      error: 'Demo accounts are read-only',
    });
  });
});
