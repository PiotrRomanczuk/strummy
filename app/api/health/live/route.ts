/**
 * GET /api/health/live — unauthenticated liveness probe.
 *
 * Why this exists alongside `/api/health`: that endpoint is admin-only (401
 * without a session), so no external uptime monitor can poll it. Every
 * observability channel in this project was therefore pull-based — someone had
 * to open a page for anything to be noticed. This is the one endpoint an
 * outside prober (Uptime Kuma on the Pi) can watch, which also makes it the
 * only signal that survives the whole Vercel deployment being down.
 *
 * Deliberately leaks nothing. `/api/health` reports per-service names, latency,
 * error strings and the cron registry; this returns a single reachability bit.
 * The underlying checker's `message` carries raw error text and must never be
 * forwarded here.
 *
 * Semantics for the prober: 200 = app is serving AND its database answers.
 * 503 = app is serving but the database does not — the case worth waking up
 * for, and one a plain "is the URL up" check cannot see, because Next will
 * happily return 200 for a shell page with a dead database behind it.
 */

import { NextResponse } from 'next/server';
import { checkSupabaseRemote } from '@/lib/health/checkers';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const database = await checkSupabaseRemote();

  // 'unconfigured' counts as down: in production a missing Supabase URL/key is
  // an outage, not a neutral state.
  const isDatabaseReachable = database.status === 'healthy';

  return NextResponse.json(
    {
      status: isDatabaseReachable ? 'ok' : 'degraded',
      database: isDatabaseReachable ? 'up' : 'down',
      checkedAt: new Date().toISOString(),
    },
    {
      status: isDatabaseReachable ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
