/**
 * Env discovery for RLS-real integration tests.
 *
 * These tests require:
 *  - A reachable Supabase instance (local on 127.0.0.1:54321 by default, OR a
 *    dedicated Supabase **branch** DB in CI — never production).
 *  - The service-role key for seeding.
 *  - The anon key for signing in as a user (RLS-real client).
 *
 * If any of these are missing we expose `isRlsTestEnvAvailable() === false`,
 * which the test harness uses to skip the suite gracefully — so contributors
 * without a local DB don't see red CI noise.
 *
 * ## Pointing the suite at a Supabase branch (Phase 0.5 / spec 11A.5)
 *
 * The RLS tests SEED and DELETE auth users, so they must target a throwaway
 * branch DB, never `zmlluqqqwrfhygvpfqka` (prod). To run them, Piotr/CI must
 * set the **dedicated** `RLS_TEST_*` env vars (preferred over the generic
 * `NEXT_PUBLIC_SUPABASE_*` so the suite can't accidentally inherit a prod URL):
 *
 *   RLS_TEST_SUPABASE_URL=https://<branch-ref>.supabase.co
 *   RLS_TEST_SERVICE_ROLE_KEY=<branch service_role key>
 *   RLS_TEST_ANON_KEY=<branch anon key>
 *
 * A hard guard below refuses to run against the known production project ref.
 */

/** Production project ref — the RLS suite must NEVER seed/delete against it. */
const PROD_PROJECT_REF = 'zmlluqqqwrfhygvpfqka';

/**
 * HARD-REFUSE guard list. The fallback chain below can silently inherit
 * whatever `NEXT_PUBLIC_SUPABASE_URL` happens to be loaded (e.g. from a prod
 * `.env`), and this suite SEEDS AND DELETES auth users — pointing it at a
 * production stack would destroy real accounts. So beyond the old cloud
 * project ref we block every known production-shaped URL:
 *
 *   - `192.168.1.75:54321`            — StudentProduction Kong on uwh
 *                                       (⚠️ 55321 is the DEV stack and stays allowed)
 *   - `strummy-db.marszal-arts.online`— Cloudflare tunnel to the prod stack
 *   - `StudentProduction`             — prod stack name, in case it appears in a URL
 *   - `strummy.vercel.app` / `strummy.app` — deployed app domains (never a
 *                                       valid Supabase target at all)
 *
 * If a marker matches we THROW (not skip) so the misconfiguration is loud.
 */
const BLOCKED_URL_MARKERS = [
  PROD_PROJECT_REF,
  '192.168.1.75:54321',
  'strummy-db.marszal-arts.online',
  'StudentProduction',
  'strummy.vercel.app',
  'strummy.app',
];

export type RlsEnv = {
  supabaseUrl: string;
  serviceRoleKey: string;
  anonKey: string;
};

export function readRlsEnv(): RlsEnv | null {
  const supabaseUrl =
    process.env.RLS_TEST_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'http://127.0.0.1:54321';

  const serviceRoleKey =
    process.env.RLS_TEST_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY ||
    '';

  const anonKey =
    process.env.RLS_TEST_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  if (!serviceRoleKey || !anonKey) return null;

  // Hard safety guard: never run the destructive RLS seed against production.
  // See BLOCKED_URL_MARKERS above — matches THROW so misconfiguration is loud.
  const blocked = BLOCKED_URL_MARKERS.find((marker) => supabaseUrl.includes(marker));
  if (blocked) {
    throw new Error(
      `RLS tests refuse to run against production-shaped URL "${supabaseUrl}" ` +
        `(matched blocked marker "${blocked}"). ` +
        'Set RLS_TEST_SUPABASE_URL to the StudentDevelopment stack (192.168.1.75:55321) ' +
        'or a throwaway Supabase branch DB instead.'
    );
  }

  return { supabaseUrl, serviceRoleKey, anonKey };
}

export function isRlsTestEnvAvailable(): boolean {
  return readRlsEnv() !== null;
}

/**
 * Jest helper: returns describe / describe.skip depending on env availability.
 * Lets every RLS suite open with `describeIfRls('...', () => { ... })`.
 */
export const describeIfRls: jest.Describe = (
  isRlsTestEnvAvailable() ? describe : describe.skip
) as jest.Describe;
