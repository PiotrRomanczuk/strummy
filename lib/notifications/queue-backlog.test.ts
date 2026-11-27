/**
 * @jest-environment node
 */
import {
  QUEUE_BACKLOG_ALARM_MINUTES,
  backlogCutoff,
  readQueueBacklog,
  summarizeBacklog,
} from './queue-backlog';

const mockFrom = jest.fn();
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

const NOW = new Date('2026-11-27T12:00:00.000Z');

function mockQuery(result: { data: unknown; count: number | null; error: unknown }) {
  const chain = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    lte: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn().mockResolvedValue(result),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

describe('summarizeBacklog', () => {
  it('is not stale when nothing is overdue', () => {
    expect(summarizeBacklog(0, null, NOW)).toEqual({
      overdue: 0,
      oldestDueAt: null,
      oldestAgeMinutes: null,
      isStale: false,
    });
  });

  it('measures the oldest row in whole minutes past its due time', () => {
    const due = '2026-11-27T10:29:30.000Z'; // 90.5 min before NOW
    expect(summarizeBacklog(3, due, NOW)).toEqual({
      overdue: 3,
      oldestDueAt: due,
      oldestAgeMinutes: 90,
      isStale: true,
    });
  });

  it('stays stale with an unparsable timestamp rather than hiding the backlog', () => {
    expect(summarizeBacklog(1, 'not-a-date', NOW)).toMatchObject({
      isStale: true,
      oldestAgeMinutes: null,
    });
  });
});

describe('backlogCutoff', () => {
  it('is the alarm threshold before now', () => {
    expect(QUEUE_BACKLOG_ALARM_MINUTES).toBe(60);
    expect(backlogCutoff(NOW)).toBe('2026-11-27T11:00:00.000Z');
  });
});

describe('readQueueBacklog', () => {
  beforeEach(() => mockFrom.mockReset());

  it('counts pending rows due before the cut-off, oldest first', async () => {
    const chain = mockQuery({
      data: [{ scheduled_for: '2026-11-27T10:00:00.000Z' }],
      count: 2,
      error: null,
    });

    await expect(readQueueBacklog(NOW)).resolves.toMatchObject({
      overdue: 2,
      oldestAgeMinutes: 120,
      isStale: true,
    });
    expect(mockFrom).toHaveBeenCalledWith('notification_queue');
    expect(chain.select).toHaveBeenCalledWith('scheduled_for', { count: 'exact' });
    expect(chain.eq).toHaveBeenCalledWith('status', 'pending');
    expect(chain.lte).toHaveBeenCalledWith('scheduled_for', '2026-11-27T11:00:00.000Z');
    expect(chain.order).toHaveBeenCalledWith('scheduled_for', { ascending: true });
  });

  it('reports an empty queue as not stale', async () => {
    mockQuery({ data: [], count: 0, error: null });
    await expect(readQueueBacklog(NOW)).resolves.toMatchObject({ isStale: false, overdue: 0 });
  });

  it('throws on a query error so the run is reported as failed', async () => {
    mockQuery({ data: null, count: null, error: { message: 'boom' } });
    await expect(readQueueBacklog(NOW)).rejects.toThrow('queue backlog query failed: boom');
  });
});
