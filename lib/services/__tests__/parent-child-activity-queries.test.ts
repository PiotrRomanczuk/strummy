import { getChildAssignments, getChildPastLessons } from '../parent-child-activity-queries';

jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn() } }));

const calls: Array<[string, unknown[]]> = [];
let result: { data: unknown[] | null; error: { message: string } | null };
jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => {
      const chain: Record<string, unknown> = {};
      for (const method of ['select', 'eq', 'is', 'neq', 'lt', 'order']) {
        chain[method] = (...args: unknown[]) => {
          calls.push([method, args]);
          return chain;
        };
      }
      chain.limit = async () => result;
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
});

describe('getChildAssignments', () => {
  it('puts open homework first, soonest due first, then the latest finished', async () => {
    result = {
      data: [
        row('done-old', 'completed', '2026-10-01'),
        row('overdue', 'overdue', '2026-11-01'),
        row('done-new', 'completed', '2026-11-05'),
        row('next', 'not_started', '2026-11-20'),
        row('undated', 'in_progress', null),
      ],
      error: null,
    };
    const ids = (await getChildAssignments('child-1', new Date('2026-10-15T10:00:00Z'))).map(
      (a) => a.id
    );
    expect(ids).toEqual(['overdue', 'next', 'undated', 'done-new', 'done-old']);
  });

  it('shows open homework past its due date as overdue, by the Warsaw calendar day', async () => {
    result = {
      data: [
        row('late', 'not_started', '2026-11-15'),
        row('today', 'in_progress', '2026-11-16'),
        row('done', 'completed', '2026-11-01'),
      ],
      error: null,
    };
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
    expect(calls).toContainEqual(['neq', ['status', 'cancelled']]);
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
