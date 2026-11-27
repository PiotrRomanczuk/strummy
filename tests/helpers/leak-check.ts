import * as fs from 'fs';
import * as path from 'path';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The rule (`.claude/rules/playwright-testing.md`): a spec deletes every row it
 * creates. This is its check: the rows created since the run started that are
 * still there when it ends.
 *
 * Why it exists: cleanup used to be a list of title and e-mail patterns, so
 * anything a spec named differently stayed. By 2026-11-27 the dev stack held
 * 406 sign-in accounts without a profile, 343 API keys and 1 101 leads.
 *
 * The dev stack is shared, so a concurrent run (another PR's CI, the RLS job)
 * shows up here too. That is why the check fails the run only when
 * E2E_LEAK_CHECK=strict (the nightly, which runs alone) and reports otherwise.
 */

/** Written by triggers and the app as a side effect; trimmed by age, not per spec. */
export const DERIVED_TABLES = new Set([
  'agent_execution_logs',
  'ai_generations',
  'ai_usage_stats',
  'assignment_history',
  'auth_events',
  'auth_rate_limits',
  'in_app_notifications',
  'lesson_history',
  'notification_log',
  'notification_preferences',
  'notification_queue',
  'song_status_history',
  'system_logs',
  'user_history',
]);

const LABEL_COLUMNS = ['title', 'name', 'email', 'full_name', 'label'];
const SAMPLE = 20;

export type Leak = { table: string; count: number; rows: { id: string; label: string }[] };

type WatchedTable = { name: string; label: string | null };

/** Tables of `database.types.ts` that have `id` and `created_at`, minus the derived ones. */
export function watchedTables(
  typesFile = path.join(process.cwd(), 'database.types.ts')
): WatchedTable[] {
  const source = fs.readFileSync(typesFile, 'utf8');
  const tables = source.slice(source.indexOf('    Tables: {'), source.indexOf('    Views: {'));
  const watched: WatchedTable[] = [];
  for (const match of tables.matchAll(/^ {6}(\w+): \{\n {8}Row: \{\n([\s\S]*?)\n {8}\}/gm)) {
    const [, name, row] = match;
    const columns = [...row.matchAll(/^ {10}(\w+)\??:/gm)].map((column) => column[1]);
    if (name.startsWith('audit_log') || DERIVED_TABLES.has(name)) continue;
    if (!columns.includes('id') || !columns.includes('created_at')) continue;
    watched.push({ name, label: LABEL_COLUMNS.find((column) => columns.includes(column)) ?? null });
  }
  return watched;
}

/** The database server's clock, so a skewed local clock cannot hide or invent rows. */
export async function runStartedAt(supabaseUrl: string): Promise<string> {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`);
    const serverTime = Date.parse(response.headers.get('date') ?? '');
    // The header has one-second resolution; a row of the first second must count.
    if (!Number.isNaN(serverTime)) return new Date(serverTime - 1_000).toISOString();
  } catch {
    // Fall through to the local clock.
  }
  return new Date(Date.now() - 5_000).toISOString();
}

async function leaksOf(
  db: SupabaseClient,
  table: WatchedTable,
  since: string
): Promise<Leak | null> {
  const columns = table.label ? `id, ${table.label}` : 'id';
  const { data, count, error } = await db
    .from(table.name)
    .select(columns, { count: 'exact' })
    .gte('created_at', since)
    .limit(SAMPLE);
  if (error) throw new Error(`leak check: ${table.name}: ${error.message}`);
  if (!count) return null;
  const rows = (data as unknown as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    label: table.label ? String(row[table.label] ?? '') : '',
  }));
  return { table: table.name, count, rows };
}

async function authLeaks(db: SupabaseClient, since: string): Promise<Leak | null> {
  const rows: Leak['rows'] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`leak check: auth.users: ${error.message}`);
    for (const user of data.users) {
      if (user.created_at >= since) rows.push({ id: user.id, label: user.email ?? '' });
    }
    if (data.users.length < 1000) break;
  }
  return rows.length
    ? { table: 'auth.users', count: rows.length, rows: rows.slice(0, SAMPLE) }
    : null;
}

/** Rows created at or after `since` that still exist, per table. Empty = the run cleaned up. */
export async function findLeaks(db: SupabaseClient, since: string): Promise<Leak[]> {
  const found = await Promise.all([
    authLeaks(db, since),
    ...watchedTables().map((table) => leaksOf(db, table, since)),
  ]);
  return found.filter((leak): leak is Leak => leak !== null);
}

export function formatLeaks(leaks: Leak[]): string {
  return leaks
    .map((leak) => {
      const rows = leak.rows.map((row) => `    ${row.id}  ${row.label}`).join('\n');
      const more =
        leak.count > leak.rows.length ? `\n    … and ${leak.count - leak.rows.length} more` : '';
      return `  ${leak.table}: ${leak.count}\n${rows}${more}`;
    })
    .join('\n');
}

export class TestDataLeak extends Error {
  readonly isTestDataLeak = true;
}
