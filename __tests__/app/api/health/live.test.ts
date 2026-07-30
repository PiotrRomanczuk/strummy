/**
 * Tests for GET /api/health/live — the unauthenticated liveness probe.
 *
 * Two properties matter and neither is obvious from reading the handler:
 *
 * 1. The status CODE must differentiate healthy from degraded. An uptime
 *    monitor keys on it; if this endpoint always answered 200 it would report
 *    "up" while the database was unreachable, which is worse than no monitor
 *    because it manufactures confidence.
 * 2. It must leak NOTHING. `/api/health` is admin-only precisely because it
 *    exposes service names, latencies and raw error strings. This route is
 *    public, so the underlying checker's `message` must never reach the body.
 */

import { GET } from '@/app/api/health/live/route';
import { checkSupabaseRemote } from '@/lib/health/checkers';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
      status: init?.status ?? 200,
      headers: init?.headers ?? {},
      json: async () => data,
    }),
  },
}));

jest.mock('@/lib/health/checkers', () => ({
  checkSupabaseRemote: jest.fn(),
}));

const mockCheck = checkSupabaseRemote as jest.Mock;

describe('GET /api/health/live', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 and status ok when the database answers', async () => {
    mockCheck.mockResolvedValue({
      name: 'Supabase Remote',
      status: 'healthy',
      latencyMs: 42,
      checkedAt: '2026-07-30T00:00:00.000Z',
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.database).toBe('up');
  });

  it('returns 503 when the database is unreachable', async () => {
    mockCheck.mockResolvedValue({
      name: 'Supabase Remote',
      status: 'error',
      message: 'Error: connect ECONNREFUSED 10.0.0.1:5432',
      checkedAt: '2026-07-30T00:00:00.000Z',
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe('degraded');
    expect(body.database).toBe('down');
  });

  it('treats an unconfigured database as down, not as a neutral state', async () => {
    // In production a missing Supabase URL/key is an outage. Reporting 200 here
    // would hide a broken deployment behind a green check.
    mockCheck.mockResolvedValue({
      name: 'Supabase Remote',
      status: 'unconfigured',
      message: 'Not configured',
      checkedAt: '2026-07-30T00:00:00.000Z',
    });

    const res = await GET();

    expect(res.status).toBe(503);
  });

  it('never leaks the checker message, host or latency to an unauthenticated caller', async () => {
    mockCheck.mockResolvedValue({
      name: 'Supabase Remote',
      status: 'error',
      message: 'Error: connect ECONNREFUSED 192.168.1.75:54322',
      latencyMs: 3001,
      checkedAt: '2026-07-30T00:00:00.000Z',
    });

    const res = await GET();
    const body = await res.json();
    const serialized = JSON.stringify(body);

    expect(serialized).not.toContain('ECONNREFUSED');
    expect(serialized).not.toContain('192.168.1.75');
    expect(serialized).not.toContain('3001');
    expect(Object.keys(body).sort()).toEqual(['checkedAt', 'database', 'status']);
  });

  it('is not cached, so a prober always sees current state', async () => {
    mockCheck.mockResolvedValue({
      name: 'Supabase Remote',
      status: 'healthy',
      checkedAt: '2026-07-30T00:00:00.000Z',
    });

    const res = await GET();

    expect(res.headers['Cache-Control']).toBe('no-store');
  });
});
