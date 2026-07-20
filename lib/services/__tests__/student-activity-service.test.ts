/**
 * Student Activity Service — Smoke Test
 *
 * Purpose: catch schema/column drift at CI time. The function previously
 * referenced a `profiles.deleted_at` column that does not exist on prod,
 * which made the daily cron silently throw for months (see #328).
 *
 * This test runs the real function code against a mocked Supabase client
 * and asserts the function does not throw and returns a result with the
 * expected shape. It is intentionally NOT a deep unit test of the
 * status-transition logic — that's a separate concern.
 */

import { updateStudentActivityStatus } from '../student-activity-service';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe('student-activity-service (smoke)', () => {
  // Chainable supabase client mock. Every builder method returns `mock`
  // itself so the chain composes; terminal calls (`.in`, `.single`,
  // `.eq` on `.update`) are stubbed per test where needed.
  const buildMockSupabase = () => {
    const mock = {
      from: jest.fn(),
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      eq: jest.fn(),
      in: jest.fn(),
      is: jest.fn(),
      gte: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
      single: jest.fn(),
    };

    mock.from.mockReturnValue(mock);
    mock.select.mockReturnValue(mock);
    mock.insert.mockResolvedValue({ error: null });
    mock.update.mockReturnValue(mock);
    mock.eq.mockReturnValue(mock);
    mock.is.mockReturnValue(mock);
    mock.gte.mockReturnValue(mock);
    mock.order.mockReturnValue(mock);
    mock.limit.mockReturnValue(mock);

    return mock;
  };

  let mockSupabase: ReturnType<typeof buildMockSupabase>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = buildMockSupabase();
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);
  });

  it('returns the expected result shape when no students match', async () => {
    // Terminal call for profiles fetch chain ends on `.in(...)`
    mockSupabase.in.mockResolvedValueOnce({ data: [], error: null });

    const result = await updateStudentActivityStatus();

    expect(result).toEqual({
      processed: 0,
      activatedCount: 0,
      deactivatedCount: 0,
      activated: [],
      deactivated: [],
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
  });

  it('processes returned students without throwing', async () => {
    const students = [
      { id: 'a', email: 'a@x.com', full_name: 'A', student_status: 'active' },
      { id: 'b', email: 'b@x.com', full_name: 'B', student_status: 'archived' },
    ];
    mockSupabase.in.mockResolvedValueOnce({ data: students, error: null });

    // Each student triggers two `.single()` lookups (last completed, next
    // scheduled). Return "no rows" for all of them so no status change
    // fires and the test stays a pure smoke check.
    mockSupabase.single.mockResolvedValue({ data: null, error: null });

    const result = await updateStudentActivityStatus();

    expect(result.processed).toBe(students.length);
    expect(result).toMatchObject({
      processed: expect.any(Number),
      activatedCount: expect.any(Number),
      deactivatedCount: expect.any(Number),
      activated: expect.any(Array),
      deactivated: expect.any(Array),
    });
  });

  it('throws a helpful error when the profiles fetch fails', async () => {
    // This is the exact failure mode from #328 — column drift causes
    // Supabase to return an error here. Make sure we still surface it
    // loudly instead of returning a zeroed result.
    mockSupabase.in.mockResolvedValueOnce({
      data: null,
      error: { message: 'column profiles.deleted_at does not exist', code: '42703' },
    });

    await expect(updateStudentActivityStatus()).rejects.toThrow(/Failed to fetch students/);
  });
});

// ============================================================================
// Status-transition logic
//
// The smoke test above shares one chain object across every table, which is
// enough to prove the function runs but cannot drive a status change. This
// block dispatches per table so the archive/reactivate transitions and the
// two write-failure paths can be exercised.
// ============================================================================

import { logger } from '@/lib/logger';

type Student = { id: string; email: string; full_name: string | null; student_status: string };
type QueryResult = { data?: unknown; error?: unknown };

function buildDispatchSupabase(config: {
  students: Student[];
  /** FIFO of `.single()` results: two per student — last completed, then next scheduled. */
  lessons?: QueryResult[];
  updateError?: unknown;
  historyError?: unknown;
}) {
  const lessonQueue = [...(config.lessons ?? [])];
  const spies = { update: jest.fn(), insert: jest.fn() };

  // Every table gets a fresh chain exposing all terminals; which one resolves is
  // decided by the method the caller actually ends on.
  const chainFor = () => {
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'is', 'gte', 'order', 'limit']) {
      chain[method] = jest.fn(() => chain);
    }

    // profiles: the roster select terminates on `.in()`, the write on `.update().eq()`.
    chain.in = jest.fn(() => Promise.resolve({ data: config.students, error: null }));
    chain.update = jest.fn((payload: unknown) => {
      spies.update(payload);
      return { eq: jest.fn(() => Promise.resolve({ error: config.updateError ?? null })) };
    });

    // lessons: both lookups terminate on `.single()`.
    chain.single = jest.fn(() =>
      Promise.resolve(lessonQueue.shift() ?? { data: null, error: null })
    );

    // user_history: a bare insert.
    chain.insert = jest.fn((payload: unknown) => {
      spies.insert(payload);
      return Promise.resolve({ error: config.historyError ?? null });
    });

    return chain;
  };

  return { client: { from: jest.fn(() => chainFor()) }, spies };
}

const student = (over: Partial<Student> = {}): Student => ({
  id: 'stu-1',
  email: 'emma@example.com',
  full_name: 'Emma',
  student_status: 'active',
  ...over,
});

/** 2026-07-20 minus 28 days = 2026-06-22 cutoff. */
const NOW = new Date('2026-07-20T12:00:00.000Z');
const RECENT = '2026-07-10T10:00:00.000Z';
const STALE = '2026-01-05T10:00:00.000Z';
const FUTURE = '2026-08-01T10:00:00.000Z';

describe('student-activity-service — status transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ doNotFake: ['nextTick'] });
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const arm = (config: Parameters<typeof buildDispatchSupabase>[0]) => {
    const built = buildDispatchSupabase(config);
    (createClient as jest.Mock).mockResolvedValue(built.client);
    return built;
  };

  it('archives an active student with no recent and no future lesson', async () => {
    const { spies } = arm({
      students: [student({ student_status: 'active' })],
      lessons: [{ data: null }, { data: null }],
    });

    const result = await updateStudentActivityStatus();

    expect(result.deactivatedCount).toBe(1);
    expect(result.deactivated).toEqual([
      { id: 'stu-1', email: 'emma@example.com', full_name: 'Emma' },
    ]);
    expect(result.activatedCount).toBe(0);
    expect(spies.update).toHaveBeenCalledWith(
      expect.objectContaining({ student_status: 'archived' })
    );
    expect(spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({ change_type: 'status_changed' })
    );
  });

  it('reactivates an archived student who has a future lesson', async () => {
    const { spies } = arm({
      students: [student({ student_status: 'archived' })],
      lessons: [{ data: null }, { data: { scheduled_at: FUTURE } }],
    });

    const result = await updateStudentActivityStatus();

    expect(result.activatedCount).toBe(1);
    expect(result.activated).toEqual([
      { id: 'stu-1', email: 'emma@example.com', full_name: 'Emma' },
    ]);
    expect(spies.update).toHaveBeenCalledWith(
      expect.objectContaining({ student_status: 'active' })
    );
  });

  it('reactivates an archived student whose last lesson is inside the window', async () => {
    arm({
      students: [student({ student_status: 'archived' })],
      lessons: [{ data: { scheduled_at: RECENT } }, { data: null }],
    });

    expect((await updateStudentActivityStatus()).activatedCount).toBe(1);
  });

  it('leaves an archived student archived when the last lesson predates the cutoff', async () => {
    const { spies } = arm({
      students: [student({ student_status: 'archived' })],
      lessons: [{ data: { scheduled_at: STALE } }, { data: null }],
    });

    const result = await updateStudentActivityStatus();

    expect(result.activatedCount).toBe(0);
    expect(result.deactivatedCount).toBe(0);
    expect(spies.update).not.toHaveBeenCalled();
  });

  it('leaves an active student active when a recent lesson exists', async () => {
    const { spies } = arm({
      students: [student({ student_status: 'active' })],
      lessons: [{ data: { scheduled_at: RECENT } }, { data: null }],
    });

    expect((await updateStudentActivityStatus()).deactivatedCount).toBe(0);
    expect(spies.update).not.toHaveBeenCalled();
  });

  it('ignores a student whose status is neither active nor archived', async () => {
    const { spies } = arm({
      students: [student({ student_status: 'lead' })],
      lessons: [{ data: null }, { data: null }],
    });

    const result = await updateStudentActivityStatus();

    expect(result.processed).toBe(1);
    expect(result.activatedCount).toBe(0);
    expect(result.deactivatedCount).toBe(0);
    expect(spies.update).not.toHaveBeenCalled();
  });

  it('logs and skips the history write when the profile update fails', async () => {
    const { spies } = arm({
      students: [student({ student_status: 'active' })],
      lessons: [{ data: null }, { data: null }],
      updateError: { message: 'rls denied' },
    });

    await updateStudentActivityStatus();

    expect(logger.error).toHaveBeenCalledWith('Failed to update student stu-1:', expect.anything());
    expect(spies.insert).not.toHaveBeenCalled();
  });

  it('logs when the history write fails but still counts the change', async () => {
    arm({
      students: [student({ student_status: 'active' })],
      lessons: [{ data: null }, { data: null }],
      historyError: { message: 'history table full' },
    });

    const result = await updateStudentActivityStatus();

    expect(result.deactivatedCount).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      'Failed to log history for student stu-1:',
      expect.anything()
    );
  });
});
