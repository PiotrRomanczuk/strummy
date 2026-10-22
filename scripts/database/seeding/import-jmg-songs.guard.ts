/**
 * Connection guard for import-jmg-songs: the caller names the target
 * (--target dev|prod) and the guard refuses unless the Postgres URL really
 * points at that Supabase stack on uwh (see CLAUDE.md "Supabase stacks").
 *
 *   StudentDevelopment (DEV)  → Postgres 192.168.1.75:55322
 *   StudentProduction  (PROD) → Postgres 192.168.1.75:54322
 *
 * Two layers: (1) the URL must be uwh's port for that target, or a localhost
 * SSH tunnel (`ssh -L 55322:127.0.0.1:55322 uwh`); (2) after connecting, the
 * cluster's pg_control_system().system_identifier must equal the pinned value
 * for the target. Layer 2 is what makes a mislabelled tunnel harmless. If a
 * stack is ever recreated, the check fails closed — re-pin from
 * `docker exec supabase_db_<Stack> psql -U postgres -Atc
 * "select system_identifier from pg_control_system()"` on uwh.
 */

import fs from 'fs';

export type ImportTarget = 'dev' | 'prod';

const UWH_HOSTS = ['192.168.1.75'];
const TUNNEL_HOSTS = ['127.0.0.1', 'localhost'];
/** Pinned 2026-10-17 from the live stacks on uwh. Not secret. */
export const SYSTEM_IDENTIFIER: Record<ImportTarget, string> = {
  dev: '7654300329069211686',
  prod: '7654158243728179239',
};
const TARGET_PORT: Record<ImportTarget, string> = { dev: '55322', prod: '54322' };
/** Anything matching these is production, whatever the caller claims. */
const PROD_MARKERS = [
  /:5432[1-7]\b/,
  /strummy\.online/i,
  /marszal-arts\.online/i,
  /pooler\.supabase\.com/i,
];
const MAX_BACKUP_AGE_MS = 6 * 60 * 60 * 1000;

export interface GuardInput {
  target: string | undefined;
  dbUrl: string | undefined;
  backupPath?: string;
  now?: number;
}

export function parseTarget(raw: string | undefined): ImportTarget {
  if (raw === 'dev' || raw === 'prod') return raw;
  throw new Error('--target is required and must be "dev" or "prod"');
}

/** Returns the validated target, or throws with a human-readable refusal. */
export function assertTarget({
  target,
  dbUrl,
  backupPath,
  now = Date.now(),
}: GuardInput): ImportTarget {
  const t = parseTarget(target);
  if (!dbUrl)
    throw new Error('No database URL (set JMG_IMPORT_DB_URL or POSTGRES_URL in .env.local)');
  let url: URL;
  try {
    url = new URL(dbUrl);
  } catch {
    throw new Error('Database URL is not a valid URL');
  }
  const where = `${url.hostname}:${url.port || '5432'}`;
  const isTunnel = TUNNEL_HOSTS.includes(url.hostname);
  if (!isTunnel && (!UWH_HOSTS.includes(url.hostname) || url.port !== TARGET_PORT[t])) {
    throw new Error(
      `Refusing: --target ${t} expects ${UWH_HOSTS[0]}:${TARGET_PORT[t]} (or a localhost tunnel), got ${where}`
    );
  }
  if (t === 'dev' && PROD_MARKERS.some((re) => re.test(dbUrl))) {
    throw new Error(`Refusing: ${where} looks like PRODUCTION`);
  }
  if (t === 'prod') assertFreshBackup(backupPath, now);
  return t;
}

/** Layer 2: the connected cluster must be the one pinned for the target. */
export function assertClusterIdentity(target: ImportTarget, systemIdentifier: string): void {
  if (systemIdentifier !== SYSTEM_IDENTIFIER[target]) {
    const other = (Object.keys(SYSTEM_IDENTIFIER) as ImportTarget[]).find(
      (k) => SYSTEM_IDENTIFIER[k] === systemIdentifier
    );
    throw new Error(
      `Refusing: connected cluster is ${other ? other.toUpperCase() : `unknown (${systemIdentifier})`}, not ${target.toUpperCase()}`
    );
  }
}

/** Prod imports need a pg_dump taken within the last 6 hours (--backup <file>). */
export function assertFreshBackup(backupPath: string | undefined, now: number): void {
  if (!backupPath) throw new Error('Refusing prod import without --backup <fresh pg_dump file>');
  if (!fs.existsSync(backupPath)) throw new Error(`Backup file not found: ${backupPath}`);
  const stat = fs.statSync(backupPath);
  if (stat.size === 0) throw new Error(`Backup file is empty: ${backupPath}`);
  if (now - stat.mtimeMs > MAX_BACKUP_AGE_MS)
    throw new Error(`Backup older than 6h: ${backupPath}`);
}

/** user:password@host → ***@host, for logs. */
export function maskDbUrl(dbUrl: string): string {
  return dbUrl.replace(/\/\/[^@/]+@/, '//***@');
}
