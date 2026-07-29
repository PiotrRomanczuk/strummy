/**
 * Tests for GET /api/cron/prune-system-logs.
 *
 * `system_logs` had no retention at all — it grew without bound on the
 * self-hosted prod Postgres. This guards the two-tier prune (warn 30d /
 * error 90d), the auth gate, and the graceful skip when the table is absent.
 */

import { NextRequest } from 'next/server';
import {
  GET,
  WARN_RETENTION_DAYS,
  ERROR_RETENTION_DAYS,
} from '@/app/api/cron/prune-system-logs/route';

// Provide a constructable NextResponse (the global jest.setup mock only has .json)
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

import { createAdminClient } from '@/lib/supabase/admin';

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

const CRON_SECRET = 'test-cron-secret';

function makeRequest(): Request {
  return new NextRequest('http://localhost/api/cron/prune-system-logs', {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
}

interface DeleteCall {
  levels: string[];
  cutoff: string;
}

/**
 * Stubs `.from().delete().in().lt().select()`. Each invocation resolves to the
 * next queued result and records the levels + cutoff it was called with.
 */
function stubSupabase(results: Array<{ data: unknown[] | null; error: unknown }>) {
  const calls: DeleteCall[] = [];
  let i = 0;

  const from = jest.fn(() => ({
    delete: () => ({
      in: (_col: string, levels: string[]) => ({
        lt: (_tsCol: string, cutoff: string) => ({
          select: () => {
            calls.push({ levels, cutoff });
            return Promise.resolve(results[i++] ?? { data: [], error: null });
          },
        }),
      }),
    }),
  }));

  (createAdminClient as jest.Mock).mockReturnValue({ from });
  return { calls };
}

function daysAgo(iso: string): number {
  return Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

describe('GET /api/cron/prune-system-logs', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, CRON_SECRET };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('returns 401 without a valid cron secret', async () => {
    const res = await GET(new NextRequest('http://localhost/api/cron/prune-system-logs'));
    expect(res.status).toBe(401);
  });

  it('prunes warn and error tiers at their own cutoffs', async () => {
    const { calls } = stubSupabase([
      { data: [{ id: '1' }, { id: '2' }], error: null },
      { data: [{ id: '3' }], error: null },
    ]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.deletedCount).toBe(3);

    expect(calls).toHaveLength(2);
    expect(calls[0].levels).toEqual(['debug', 'info', 'warn']);
    expect(daysAgo(calls[0].cutoff)).toBe(WARN_RETENTION_DAYS);
    expect(calls[1].levels).toEqual(['error']);
    expect(daysAgo(calls[1].cutoff)).toBe(ERROR_RETENTION_DAYS);
  });

  it('keeps errors longer than warnings', () => {
    expect(ERROR_RETENTION_DAYS).toBeGreaterThan(WARN_RETENTION_DAYS);
  });

  it('skips with 200 when system_logs is absent', async () => {
    stubSupabase([{ data: null, error: { code: '42P01', message: 'relation does not exist' } }]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.skipped).toBe(true);
  });

  it('reports a real DB failure without throwing', async () => {
    stubSupabase([{ data: null, error: { code: '08006', message: 'connection failure' } }]);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Internal server error');
  });
});
