import type { SupabaseClient, User } from '@supabase/supabase-js';

import { RLS_EMAIL_DOMAIN } from './run-marker';

/** Rows of THIS run, or anything older than a cutoff (a killed run's leftovers). */
export type SweepScope = { runId: string } | { olderThan: Date };

export type SweepResult = { users: number; songs: number; errors: string[] };

const PAGE_SIZE = 1000;

function isInScope(user: User, scope: SweepScope): boolean {
  if (!user.email?.endsWith(`@${RLS_EMAIL_DOMAIN}`)) return false;
  if ('runId' in scope) return user.user_metadata?.rlsRunId === scope.runId;
  return new Date(user.created_at) < scope.olderThan;
}

async function listScopedUsers(service: SupabaseClient, scope: SweepScope): Promise<User[]> {
  const matched: User[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    matched.push(...data.users.filter((user) => isInScope(user, scope)));
    if (data.users.length < PAGE_SIZE) return matched;
  }
}

async function sweepSongs(service: SupabaseClient, scope: SweepScope): Promise<number> {
  let query = service.from('songs').delete().like('title', 'RLS %');
  query =
    'runId' in scope
      ? query.like('title', `% ${scope.runId}`)
      : query.lt('created_at', scope.olderThan.toISOString());
  const { data, error } = await query.select('id');
  if (error) throw new Error(`song sweep failed: ${error.message}`);
  return data.length;
}

/**
 * Deletes RLS test data: auth users in the RLS domain (profiles and their
 * lessons, assignments, practice and repertoire cascade) and fixture songs.
 * Never throws; every failure is returned so the caller decides how loud to be.
 */
export async function sweepRlsData(
  service: SupabaseClient,
  scope: SweepScope
): Promise<SweepResult> {
  const result: SweepResult = { users: 0, songs: 0, errors: [] };
  try {
    result.songs = await sweepSongs(service, scope);
    const users = await listScopedUsers(service, scope);
    for (const user of users) {
      const { error } = await service.auth.admin.deleteUser(user.id);
      if (error) result.errors.push(`deleteUser ${user.email}: ${error.message}`);
      else result.users += 1;
    }
  } catch (error) {
    result.errors.push((error as Error).message);
  }
  return result;
}
