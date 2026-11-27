import { adminClient, adminEmail, studentEmail, teacherEmail } from './helpers/seed-ids';
import { runStartedAt } from './helpers/leak-check';
import { serviceRoleTarget } from './helpers/prod-guard';

/**
 * Global setup for Playwright runs against the dev stack.
 *
 * Role and demo accounts are English by contract (see practice-tools-hub.spec.ts): the
 * specs assert English labels. Since STR-3 (2026-10-21) the proxy runs on
 * /dashboard and applies `profiles.locale` there, so a single stray 'pl' —
 * the 2026-10-13 Polish walkthrough left teacher@ and student@ on 'pl' —
 * turned every English assertion red. Reset it before each run.
 */
export default async function globalSetup(): Promise<void> {
  const emails = [adminEmail(), teacherEmail(), studentEmail()];
  let db;
  try {
    db = adminClient();
  } catch (error) {
    // No service-role key (e.g. a contributor without the dev stack): nothing to reset.
    console.warn(`[global-setup] skipped role-account locale reset: ${(error as Error).message}`);
    return;
  }
  // The leak check in global-teardown.ts reports rows created from here on.
  process.env.E2E_RUN_STARTED_AT = await runStartedAt(serviceRoleTarget().url);
  // Role accounts by address, the demo cohort by its domain (production has
  // all of them on 'en'; dev had drifted to 'pl').
  const resets = await Promise.all([
    db
      .from('profiles')
      .update({ locale: 'en' })
      .in('email', emails)
      .neq('locale', 'en')
      .select('email'),
    db
      .from('profiles')
      .update({ locale: 'en' })
      .like('email', '%@strummy.app')
      .neq('locale', 'en')
      .select('email'),
  ]);
  for (const { data, error } of resets) {
    if (error) throw new Error(`[global-setup] could not reset account locale: ${error.message}`);
    if (data?.length) {
      console.warn(
        `[global-setup] reset locale to 'en' for ${data.map((r) => r.email).join(', ')}`
      );
    }
  }
}
