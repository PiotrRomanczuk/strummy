/**
 * State for runs aimed at a deployed app (playwright.prod.config.ts) rather
 * than a local server. Kept apart from prod-guard.ts, which answers a narrower
 * question: "is this database URL production?".
 */

/** Set by playwright.prod.config.ts; inherited by workers, which reload the config. */
export const DEPLOYED_TARGET_ENV = 'E2E_DEPLOYED_TARGET';

/** Gitignored (.env*) file holding the target's auth endpoint + role accounts. */
export const DEPLOYED_ENV_FILE = '.env.e2e-prod.local';

const PRODUCTION_APP_HOSTS = ['strummy.online', 'www.strummy.online', 'strummy.vercel.app'];

export function isProductionAppUrl(url: string): boolean {
  try {
    return PRODUCTION_APP_HOSTS.includes(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function isDeployedRun(): boolean {
  return Boolean(process.env[DEPLOYED_TARGET_ENV]);
}

const ROLE_ACCOUNT_VARS = ['TEST_ADMIN_EMAIL', 'TEST_TEACHER_EMAIL', 'TEST_STUDENT_EMAIL'];

/** playwright.config.ts fills `*@dev.local` placeholders; those are not accounts on any deployed target. */
const isDevPlaceholder = (email: string) => email.toLowerCase().endsWith('@dev.local');

/**
 * Since 2026-10-20 production holds no test accounts: every signed-in spec runs
 * on the dev stack (e2e.yml, nightly-e2e.yml), and a run aimed at production
 * may only cover what needs no login (`--grep @smoke`). Configuring a role
 * account for a production target is therefore always a mistake — either a
 * stale `.env.e2e-prod.local` or someone about to create rows in real data —
 * so refuse before Playwright loads a single spec. `E2E_ALLOW_PROD_ACCOUNTS=1`
 * is the deliberate, logged exception.
 */
export function assertNoRoleAccountsForProduction(baseURL: string): void {
  if (!isProductionAppUrl(baseURL)) return;
  if (process.env.E2E_ALLOW_PROD_ACCOUNTS === '1') return;
  const configured = ROLE_ACCOUNT_VARS.filter((name) => {
    const email = process.env[name] || '';
    return email !== '' && !isDevPlaceholder(email);
  });
  if (configured.length === 0) return;
  throw new Error(
    [
      '',
      `REFUSING a signed-in run against ${baseURL}: ${configured.join(', ')} set.`,
      '',
      'Production has no test accounts (removed 2026-10-20). Signed-in specs run',
      'on the dev stack only. Against production run the unauthenticated subset:',
      '',
      '  E2E_SKIP_AUTH_PREFLIGHT=1 npm run test:pw:prod -- --grep @smoke',
      '',
      'and drop the TEST_* lines from .env.e2e-prod.local.',
      '',
    ].join('\n')
  );
}

/** The target's own Supabase auth endpoint. The anon key is public by design. */
export function deployedTargetAuth(): { url: string; anonKey: string } {
  return {
    url: process.env.E2E_TARGET_SUPABASE_URL || '',
    anonKey: process.env.E2E_TARGET_SUPABASE_ANON_KEY || '',
  };
}

/**
 * In a deployed run the browser talks to the target's database while a
 * service-role client would talk to whatever .env.local names — usually dev.
 * Seeding one database and asserting against the other only fails confusingly;
 * pointing .env.local at prod would make it write to real data. Either way the
 * spec is wrong for this run, so refuse before any client exists.
 */
export function assertNotDeployedRun(action: string): void {
  if (!isDeployedRun()) return;
  throw new Error(
    [
      '',
      `REFUSING to ${action} during a deployed-target run (${process.env[DEPLOYED_TARGET_ENV]}).`,
      '',
      'This spec seeds or reads the database directly with a service-role client.',
      'Deployed runs execute only @prod-safe specs, which go through the UI alone.',
      'Tag a spec @prod-safe only once it needs no adminClient().',
      '',
    ].join('\n')
  );
}
