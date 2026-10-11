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
