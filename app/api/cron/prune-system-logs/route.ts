/**
 * Cron Job: system_logs Retention
 *
 * `system_logs` is the persisted warn/error stream (ADR 0003 Phase 2.5).
 * Nothing pruned it, so it grew without bound on the self-hosted prod
 * Postgres. Two tiers, because the levels have different half-lives:
 *
 *   warn  — 30 days. Mostly noise-with-a-pulse (rate limits, absent tables);
 *           useful for "was it already happening last week?", not beyond.
 *   error — 90 days. Matches the auth_events retention window and covers a
 *           full quarter of incident review.
 *
 * Runs via the dispatcher (see app/api/cron/dispatcher/route.ts); also
 * callable directly.
 *
 * @route GET /api/cron/prune-system-logs
 */

import { NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth/cron-auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { isMissingTableError } from '@/lib/services/db-error-helpers';
import { createLogger } from '@/lib/logger';

export const WARN_RETENTION_DAYS = 30;
export const ERROR_RETENTION_DAYS = 90;

const log = createLogger('cron:prune-system-logs');

export const dynamic = 'force-dynamic';

function cutoff(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

type PruneOutcome = { deleted: number; cutoff: string };

/**
 * Delete rows at `levels` older than `days`. Returns null when the table is
 * absent (fresh DB / partially migrated environment) so the caller can skip.
 */
async function pruneLevels(
  supabase: ReturnType<typeof createAdminClient>,
  levels: string[],
  days: number
): Promise<PruneOutcome | null> {
  const cutoffISO = cutoff(days);

  const { data, error } = await supabase
    .from('system_logs' as never)
    .delete()
    .in('level' as never, levels)
    .lt('occurred_at', cutoffISO)
    .select('id' as never);

  if (error) {
    if (isMissingTableError(error)) return null;
    throw new Error(`${error.message} (levels=${levels.join(',')})`);
  }

  return { deleted: (data as unknown[] | null)?.length ?? 0, cutoff: cutoffISO };
}

export async function GET(request: Request) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  try {
    const supabase = createAdminClient();

    // debug/info are never persisted by the Supabase destination, but prune
    // them on the warn schedule anyway so a future level change can't leak.
    const warned = await pruneLevels(supabase, ['debug', 'info', 'warn'], WARN_RETENTION_DAYS);
    if (warned === null) {
      log.warn('system_logs table absent — skipping prune');
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'system_logs table not available',
        timestamp: new Date().toISOString(),
      });
    }

    const errored = await pruneLevels(supabase, ['error'], ERROR_RETENTION_DAYS);
    const deletedCount = warned.deleted + (errored?.deleted ?? 0);

    log.info('system_logs prune completed', {
      deletedCount,
      warnDeleted: warned.deleted,
      warnCutoff: warned.cutoff,
      warnRetentionDays: WARN_RETENTION_DAYS,
      errorDeleted: errored?.deleted ?? 0,
      errorRetentionDays: ERROR_RETENTION_DAYS,
    });

    return NextResponse.json({
      success: true,
      deletedCount,
      warn: { ...warned, retentionDays: WARN_RETENTION_DAYS },
      error: errored ? { ...errored, retentionDays: ERROR_RETENTION_DAYS } : null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('Unexpected error during system_logs prune', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 200 });
  }
}
