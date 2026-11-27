import { getChildAssignments, getChildPastLessons } from './parent-child-activity-queries';

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn() } }));

type Result = { data: unknown[] | null; error: { message: string } | null };
const calls: Array<[string, unknown[]]> = [];
// `result` answers every query; `openResult` / `doneResult` answer the two
// assignment queries (open = filtered with `.in('status', …)`) when set.
let result: Result;
let openResult: Result | undefined;
let doneResult: Result | undefined;
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => {
      let isOpenQuery = false;
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'is', 'neq', 'lt', 'in', 'order']) {
        chain[method] = (...args: unknown[]) => {
          calls.push([method, args]);
          if (method === 'in') isOpenQuery = true;
          return chain;
        };
      }
      chain.limit = async (count: number) => {
        calls.push(['limit', [count]]);
        return (isOpenQuery ? openResult : doneResult) ?? result;
      };
      return chain;
    },
  }),
}));

const row = (id: string, status: string, due: string | null) => ({
  id,
  title: id,
  status,
  due_date: due,
});

beforeEach(() => {
  calls.length = 0;
  result = { data: [], error: null };
  openResult = undefined;
  doneResult = undefined;
});

describe('getChildAssignments', () => {
  it('puts open homework first, soonest due first, then the latest finished', async () => {
    openResult = {
      data: [
        row('overdue', 'overdue', '2026-11-01'),
        row('next', 'not_started', '2026-11-20'),
        row('undated', 'in_progress', null),
      ],
      error: null,
    };
    doneResult = {
      data: [
        row('done-new', 'completed', '2026-11-05'),
        row('done-old', 'completed', '2026-10-01'),
      ],
      error: null,
    };
    const ids = (await getChildAssignments('child-1', new Date('2026-10-15T10:00:00Z'))).map(
      (a) => a.id
    );
    expect(ids).toEqual(['overdue', 'next', 'undated', 'done-new', 'done-old']);
  });

  it('queries open and finished homework separately, so a long history keeps the open ones', async () => {
    // 60 finished assignments exist; the open one must still come back because
    // it is asked for on its own, with its own small limit.
    openResult = { data: [row('current', 'in_progress', '2026-11-30')], error: null };
    doneResult = {
      data: Array.from({ length: 8 }, (_, i) => row(`done-${i}`, 'completed', '2026-10-01')),
      error: null,
    };
    const items = await getChildAssignments('child-1', new Date('2026-11-16T10:00:00Z'));
    expect(items[0].id).toBe('current');
    expect(calls).toContainEqual(['in', ['status', ['not_started', 'in_progress', 'overdue']]]);
    expect(calls).toContainEqual(['eq', ['status', 'completed']]);
    expect(calls.filter(([method]) => method === 'limit')).toEqual([
      ['limit', [8]],
      ['limit', [8]],
    ]);
  });

  it('shows open homework past its due date as overdue, by the Warsaw calendar day', async () => {
    openResult = {
      data: [row('late', 'not_started', '2026-11-15'), row('today', 'in_progress', '2026-11-16')],
      error: null,
    };
    doneResult = { data: [row('done', 'completed', '2026-11-01')], error: null };
    // 23:30 UTC on the 15th is already the 16th in Warsaw.
    const statuses = (await getChildAssignments('child-1', new Date('2026-11-15T23:30:00Z'))).map(
      (a) => [a.id, a.status]
    );
    expect(statuses).toEqual([
      ['late', 'overdue'],
      ['today', 'in_progress'],
      ['done', 'completed'],
    ]);
  });

  it('selects display fields only and leaves out cancelled and deleted homework', async () => {
    await getChildAssignments('child-1');
    expect(calls).toContainEqual(['select', ['id, title, status, due_date']]);
    // Cancelled is in neither status filter (open list / completed).
    expect(calls).not.toContainEqual(['eq', ['status', 'cancelled']]);
    expect(calls).toContainEqual(['is', ['deleted_at', null]]);
  });

  it('returns nothing on a database error', async () => {
    result = { data: null, error: { message: 'boom' } };
    await expect(getChildAssignments('child-1')).resolves.toEqual([]);
  });
});

describe('getChildPastLessons', () => {
  it('asks for lessons before now, without their notes', async () => {
    const now = new Date('2026-11-16T10:00:00Z');
    result = {
      data: [{ id: 'l1', scheduled_at: '2026-11-13T16:00:00Z', title: null, status: 'COMPLETED' }],
      error: null,
    };
    await expect(getChildPastLessons('child-1', now)).resolves.toEqual([
      { id: 'l1', scheduledAt: '2026-11-13T16:00:00Z', title: null, status: 'COMPLETED' },
    ]);
    expect(calls).toContainEqual(['select', ['id, scheduled_at, title, status']]);
    expect(calls).toContainEqual(['lt', ['scheduled_at', now.toISOString()]]);
  });
});
