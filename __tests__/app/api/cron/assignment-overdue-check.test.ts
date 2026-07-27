/**
 * Regression tests for GET /api/cron/assignment-overdue-check.
 *
 * Guards auth gating, the empty-result path, the happy path (queues an alert
 * per newly-overdue assignment WITHOUT persisting 'overdue' — derived at read
 * time since 2026-07-27), the 24h notify-once window, and graceful
 * degradation on a DB error and a single failed queueNotification call.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/assignment-overdue-check/route';

jest.mock('next/server', () => {
  class MockNextResponse {
    body: unknown;
    status: number;
    constructor(body: unknown, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }
    async json() {
      return this.body;
    }
    static json(data: unknown, init?: { status?: number }) {
      return { status: init?.status ?? 200, json: async () => data };
    }
  }
  class MockNextRequest {
    url: string;
    headers: Headers;
    constructor(url: string, init?: { headers?: HeadersInit }) {
      this.url = url;
      this.headers = new Headers(init?.headers);
    }
  }
  return { NextResponse: MockNextResponse, NextRequest: MockNextRequest };
});

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('@/lib/services/notification-service', () => ({
  queueNotification: jest.fn(),
}));

import { createAdminClient } from '@/lib/supabase/admin';
import { queueNotification } from '@/lib/services/notification-service';

const CRON_SECRET = 'test-cron-secret';

function makeRequest(): Request {
  return new NextRequest('http://localhost/api/cron/assignment-overdue-check', {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
}

/**
 * Builds a Supabase client stub for the single query the route makes:
 * `.from('assignments').select(...).in().lt().gte()` to find assignments that
 * became overdue inside the 24h window. An `update` spy is kept ONLY to prove
 * the route never persists 'overdue' (retired 2026-07-27, derived at read time).
 */
function mockAssignmentsClient(selectResult: { data: unknown; error: unknown }) {
  const gte = jest.fn().mockResolvedValue(selectResult);
  const lt = jest.fn(() => ({ gte }));
  const inSelect = jest.fn(() => ({ lt }));
  const select = jest.fn(() => ({ in: inSelect }));

  const update = jest.fn();

  return {
    from: jest.fn(() => ({ select, update })),
    __update: update,
    __lt: lt,
    __gte: gte,
  };
}

describe('GET /api/cron/assignment-overdue-check', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, CRON_SECRET };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('returns 401 without a valid cron secret', async () => {
    const res = await GET(new NextRequest('http://localhost/api/cron/assignment-overdue-check'));
    expect(res.status).toBe(401);
  });

  it('returns 200 with count 0 when there are no overdue assignments', async () => {
    const client = mockAssignmentsClient({ data: [], error: null });
    (createAdminClient as jest.Mock).mockReturnValue(client);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.count).toBe(0);
    expect(client.__update).not.toHaveBeenCalled();
    expect(queueNotification).not.toHaveBeenCalled();
  });

  it('queues an alert for each newly-overdue assignment without persisting status', async () => {
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const client = mockAssignmentsClient({
      data: [
        {
          id: 'a1',
          title: 'Practice scales',
          due_date: twelveHoursAgo,
          student_id: 'student-1',
          student_profile: { id: 'student-1', email: 's1@test.com', full_name: 'Student One' },
        },
      ],
      error: null,
    });
    (createAdminClient as jest.Mock).mockReturnValue(client);
    (queueNotification as jest.Mock).mockResolvedValue({ success: true });

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.queued).toBe(1);
    expect(body.failed).toBe(0);
    expect(body.total).toBe(1);
    // 'overdue' is derived at read time — the route must NEVER write status
    expect(client.__update).not.toHaveBeenCalled();
    // Stateless notify-once: both window bounds applied (lt now, gte now-24h)
    expect(client.__lt).toHaveBeenCalledWith('due_date', expect.any(String));
    expect(client.__gte).toHaveBeenCalledWith('due_date', expect.any(String));
    const ltArg = new Date((client.__lt as jest.Mock).mock.calls[0][1] as string).getTime();
    const gteArg = new Date((client.__gte as jest.Mock).mock.calls[0][1] as string).getTime();
    expect(ltArg - gteArg).toBe(24 * 60 * 60 * 1000);
    expect(queueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'assignment_overdue_alert',
        recipientUserId: 'student-1',
        templateData: expect.objectContaining({
          daysOverdue: expect.any(Number),
        }),
      })
    );
  });

  it('counts a failed queueNotification without failing the whole batch', async () => {
    const client = mockAssignmentsClient({
      data: [
        {
          id: 'a1',
          title: 'Practice scales',
          due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          student_id: 'student-1',
          student_profile: null,
        },
      ],
      error: null,
    });
    (createAdminClient as jest.Mock).mockReturnValue(client);
    (queueNotification as jest.Mock).mockRejectedValue(new Error('Queue unavailable'));

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.queued).toBe(0);
    expect(body.failed).toBe(1);
  });

  it('returns 200 with success:false when fetching overdue assignments fails', async () => {
    const client = mockAssignmentsClient({ data: null, error: { message: 'connection failure' } });
    (createAdminClient as jest.Mock).mockReturnValue(client);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(false);
  });
});
