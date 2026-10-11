/**
 * The one place E2E code decides "is this database production?".
 *
 * The 2026-10-11 prod-safety audit (docs/audits/2026-10-11-e2e-prod-safety-audit.md)
 * found the guard only on the global teardown, while ~30 specs wrote through
 * their own service-role clients with no check at all. The key is the gate:
 * whoever holds a service-role client can bypass RLS, so the guard lives where
 * that client is built (seed-ids.adminClient, cleanup.getSupabaseClient).
 */

/** Hostnames that only ever serve the live production database. */
export const PRODUCTION_DB_HOSTS = ['db.strummy.online', 'strummy-db.marszal-arts.online'];

/**
 * Production endpoints on the LAN host the dev stack shares. Dev and prod
 * differ only by port (dev 55321/55322, prod 54321/54322), so host alone is
 * not enough: CLAUDE.md, "Port 54321 is PRODUCTION".
 */
const PRODUCTION_HOST_PORTS = [
  { host: '192.168.1.75', port: '54321' }, // prod Kong / API
  { host: '192.168.1.75', port: '54322' }, // prod Postgres
  { host: 'supabase_db_studentproduction', port: '' },
];

/** Marker so globalTeardown can re-throw this instead of swallowing it. */
export class ProductionCleanupRefused extends Error {
  readonly isProductionRefusal = true;
}

/** True when `url` addresses a production database. */
export function isProductionUrl(url: string): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const host = parsed.hostname.toLowerCase();
  if (PRODUCTION_DB_HOSTS.includes(host)) return true;
  return PRODUCTION_HOST_PORTS.some(
    (p) => p.host === host && (p.port === '' || p.port === parsed.port)
  );
}

/**
 * The Supabase URL + key a service-role client in tests will actually use.
 * Cleanup and seeding resolve through this, so the URL the guard checks is the
 * URL the writes go to. They used to differ: the guard read
 * LOCAL || URL while cleanup deleted on LOCAL || REMOTE || URL.
 */
export function serviceRoleTarget(): { url: string; key: string } {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_REMOTE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    '';
  const key =
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_REMOTE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  return { url, key };
}

/** Throw before any service-role client is handed out against production. */
export function assertNotProduction(url: string, action: string): void {
  if (!isProductionUrl(url)) return;
  const host = new URL(url).hostname;
  throw new ProductionCleanupRefused(
    [
      '',
      `REFUSING to ${action}: the configured database is ${host}, which is PRODUCTION.`,
      '',
      'A service-role client bypasses RLS. From a test runner, against production,',
      'that is real student data with no undo.',
      '',
      'Most likely .env.local is pointed at prod. Switch back:',
      '',
      '  ./scripts/development/switch-db.sh local',
      '',
      'To smoke the deployed app, run only the specs that need no direct DB access:',
      '',
      '  npm run test:pw:prod',
      '',
    ].join('\n')
  );
}
