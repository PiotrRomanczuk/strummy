/**
 * @jest-environment node
 *
 * GET /api/cron/process-notification-queue — called by the daily dispatcher
 * and by the uwh timer (scripts/ops/notification-queue/). Guards the bearer
 * check both triggers rely on and the `backlog` field the timer's script reads.
 */

jest.mock('@/lib/services/notification-queue-processor', () => ({
  processQueuedNotifications: jest.fn(),
  retryFailedNotifications: jest.fn(),
}));
jest.mock('@/lib/auth/rate-limiter', () => ({
  cleanupExpiredAuthEntries: jest.fn(),
}));
jest.mock('@/lib/notifications/notification-logger', () => ({
  logCronStart: jest.fn(),
  logCronComplete: jest.fn(),
  logCronError: jest.fn(),
}));
jest.mock('@/lib/notifications/queue-backlog', () => ({
  readQueueBacklog: jest.fn(),
}));

import { GET } from '@/app/api/cron/process-notification-queue/route';
import {
  processQueuedNotifications,
  retryFailedNotifications,
} from '@/lib/services/notification-queue-processor';
import { readQueueBacklog } from '@/lib/notifications/queue-backlog';
import { cleanupExpiredAuthEntries } from '@/lib/auth/rate-limiter';

const SECRET = 'queue-test-secret';
const NO_BACKLOG = { overdue: 0, oldestDueAt: null, oldestAgeMinutes: null, isStale: false };

function request(authorization?: string): Request {
  const headers = new Headers();
  if (authorization !== undefined) headers.set('authorization', authorization);
  return new Request('http://localhost/api/cron/process-notification-queue', { headers });
}

describe('GET /api/cron/process-notification-queue', () => {
  const original = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = SECRET;
    jest.clearAllMocks();
    (processQueuedNotifications as jest.Mock).mockResolvedValue({ processed: 2, failed: 0 });
    (retryFailedNotifications as jest.Mock).mockResolvedValue({
      retried: 1,
      failed: 0,
      deadLettered: 0,
    });
    (readQueueBacklog as jest.Mock).mockResolvedValue(NO_BACKLOG);
  });

  afterAll(() => {
    process.env.CRON_SECRET = original;
  });

  it.each([
    ['no header', undefined],
    ['wrong secret', 'Bearer nope'],
  ])('rejects %s with 401 and touches nothing', async (_label, auth) => {
    const res = await GET(request(auth));
    expect(res.status).toBe(401);
    expect(processQueuedNotifications).not.toHaveBeenCalled();
    expect(readQueueBacklog).not.toHaveBeenCalled();
  });

  it('answers 500 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(500);
    expect(processQueuedNotifications).not.toHaveBeenCalled();
  });

  it('drains, retries and reports an empty backlog', async () => {
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      queue: { processed: 2, failed: 0 },
      retry: { retried: 1, failed: 0, deadLettered: 0 },
      backlog: NO_BACKLOG,
    });
  });

  it('reads the backlog after the drain', async () => {
    await GET(request(`Bearer ${SECRET}`));
    const drained = (processQueuedNotifications as jest.Mock).mock.invocationCallOrder[0];
    const read = (readQueueBacklog as jest.Mock).mock.invocationCallOrder[0];
    expect(read).toBeGreaterThan(drained);
  });

  it('passes a stale backlog through for the timer to alarm on', async () => {
    const stale = {
      overdue: 4,
      oldestDueAt: '2026-11-27T09:00:00.000Z',
      oldestAgeMinutes: 180,
      isStale: true,
    };
    (readQueueBacklog as jest.Mock).mockResolvedValue(stale);
    const body = await (await GET(request(`Bearer ${SECRET}`))).json();
    expect(body.success).toBe(true);
    expect(body.backlog).toEqual(stale);
  });

  it('drains 100 at a time and runs the rate-limit cleanup', async () => {
    await GET(request(`Bearer ${SECRET}`));
    expect(processQueuedNotifications).toHaveBeenCalledWith(100);
    expect(cleanupExpiredAuthEntries).toHaveBeenCalledTimes(1);
  });

  it('answers 200 with success: false when the processor throws', async () => {
    (processQueuedNotifications as jest.Mock).mockRejectedValue(new Error('queue DB down'));
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(false);
    expect(retryFailedNotifications).not.toHaveBeenCalled();
    expect(readQueueBacklog).not.toHaveBeenCalled();
  });

  it('reports success: false when the backlog cannot be read', async () => {
    (readQueueBacklog as jest.Mock).mockRejectedValue(new Error('db down'));
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: 'Internal Server Error',
    });
  });
});
