import type { SupabaseClient } from '@supabase/supabase-js';

import { isProtectedAccount } from './cleanup';

/**
 * Safety net for rows a spec failed to delete: a run killed by fail-fast
 * (E2E_MAX_FAILURES), a timeout, or a cleanup that only soft-deleted
 * (`DELETE /api/song` sets deleted_at). The dev stack had collected 3 080
 * fixture songs and 5 562 test accounts by 2026-10-21.
 *
 * Only rows older than STALE_AFTER_MS are touched, so a run never deletes data
 * a concurrent run (another PR's CI, the nightly) is still using. Fresh rows
 * are each spec's own afterEach/afterAll job.
 */
export const STALE_AFTER_MS = 60 * 60 * 1000;

/** Title prefixes that only tests write. */
export const TEST_TITLE_PREFIX: Record<'songs' | 'lessons' | 'assignments', RegExp> = {
  songs:
    /^((Copy of )?E2E |Panel Test \d|Category Tab Test \d|Row Expand Test \d|Exhaustive Edit Test \d)/,
  lessons: /^E2E /,
  assignments: /^E2E /,
};

/** Domains reserved for throwaway E2E accounts. The RLS domain is swept by the RLS run itself. */
export const TEST_EMAIL_DOMAIN = /@(example\.com|example\.test|noreply-test\.invalid)$/i;

export function isStale(createdAt: string, now: number = Date.now()): boolean {
  return now - new Date(createdAt).getTime() > STALE_AFTER_MS;
}

/**
 * Throwaway accounts some specs create inside the protected `dev.local` domain
 * (flows F01/F02/F11, onboarding). Matched by their test prefix only — the
 * role accounts (admin@, teacher@, student@, …) never match.
 */
export const THROWAWAY_DEV_LOCAL = /^(e2e[-.]|flow\.teacher\.|debug-onb-)[^@]+@dev\.local$/i;

export function isTestAccountEmail(email: string | null): boolean {
  if (!email) return false;
  if (THROWAWAY_DEV_LOCAL.test(email)) return true;
  return TEST_EMAIL_DOMAIN.test(email) && !isProtectedAccount(email);
}

export type StaleSweepResult = { deleted: Record<string, number>; errors: string[] };

type TitledRow = { id: string; title: string | null; created_at: string };
type ProfileRow = { id: string; user_id: string | null; email: string | null; created_at: string };

async function sweepTitled(
  supabase: SupabaseClient,
  table: keyof typeof TEST_TITLE_PREFIX,
  result: StaleSweepResult
): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS).toISOString();
  const { data, error } = await supabase
    .from(table)
    .select('id, title, created_at')
    .lt('created_at', cutoff)
    .limit(5000);
  if (error) return void result.errors.push(`${table}: ${error.message}`);

  const ids = (data as TitledRow[])
    .filter((row) => row.title && TEST_TITLE_PREFIX[table].test(row.title))
    .map((row) => row.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .in('id', ids.slice(i, i + 200));
    if (deleteError) return void result.errors.push(`${table}: ${deleteError.message}`);
  }
  result.deleted[table] = ids.length;
}

async function sweepAccounts(supabase: SupabaseClient, result: StaleSweepResult): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS).toISOString();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, email, created_at')
    .lt('created_at', cutoff)
    .limit(5000);
  if (error) return void result.errors.push(`profiles: ${error.message}`);

  let deleted = 0;
  for (const profile of (data as ProfileRow[]).filter((p) => isTestAccountEmail(p.email))) {
    // Deleting the auth user cascades to the profile; a profile-only delete
    // leaves the auth account behind (how 5 562 accounts accumulated).
    const { error: deleteError } = profile.user_id
      ? await supabase.auth.admin.deleteUser(profile.user_id)
      : await supabase.from('profiles').delete().eq('id', profile.id);
    if (deleteError) result.errors.push(`account ${profile.email}: ${deleteError.message}`);
    else deleted += 1;
  }
  result.deleted.accounts = deleted;
}

export async function sweepStaleTestData(supabase: SupabaseClient): Promise<StaleSweepResult> {
  const result: StaleSweepResult = { deleted: {}, errors: [] };
  await sweepTitled(supabase, 'assignments', result);
  await sweepTitled(supabase, 'lessons', result);
  await sweepTitled(supabase, 'songs', result);
  await sweepAccounts(supabase, result);
  return result;
}
