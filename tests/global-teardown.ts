import * as fs from 'fs';

import { cleanupAllTestData, getSupabaseClient } from './helpers/cleanup';
import { sweepStaleTestData } from './helpers/stale-test-data';
import { runSqlCleanup } from './helpers/sql-cleanup';
import { findLeaks, formatLeaks, type Leak, TestDataLeak } from './helpers/leak-check';

/**
 * Global Teardown for Playwright Tests
 *
 * Runs after all tests complete to clean up test data.
 * This prevents test data pollution in the database.
 */
/**
 * Rows this run created and did not delete, read before the pattern cleanup
 * runs (it is the net for killed runs, not a spec's cleanup). Reported always;
 * fails the run with E2E_LEAK_CHECK=strict, which CI sets for Core flows, the
 * full E2E job and the nightly (all on one runner, one job at a time).
 *
 * A check that could not run is not "no leaks": the error is kept, the cleanup
 * still runs, and in strict mode the run fails.
 */
type LeakCheck = { leaks: Leak[]; error?: Error };

async function collectLeaks(): Promise<LeakCheck> {
  const since = process.env.E2E_RUN_STARTED_AT;
  if (!since) return { leaks: [], error: new Error('E2E_RUN_STARTED_AT is not set') };
  try {
    return { leaks: await findLeaks(getSupabaseClient(), since) };
  } catch (error) {
    if ((error as { isProductionRefusal?: boolean })?.isProductionRefusal) throw error;
    return { leaks: [], error: error as Error };
  }
}

function reportLeaks({ leaks, error }: LeakCheck): void {
  const isStrict = process.env.E2E_LEAK_CHECK === 'strict';
  if (error) {
    const message = `Leak check could not run: ${error.message}`;
    if (isStrict) throw new TestDataLeak(message);
    return void console.warn(`⚠️  ${message}`);
  }
  if (leaks.length === 0) return void console.log('🧾 Leak check: nothing left behind');
  const since = process.env.E2E_RUN_STARTED_AT;
  const report = `Rows created since ${since} and still there:\n${formatLeaks(leaks)}`;
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\n### Test data left behind\n\n\`\`\`\n${report}\n\`\`\`\n`
    );
  }
  if (isStrict) throw new TestDataLeak(report);
  console.warn(`⚠️  Leak check — every spec deletes what it creates:\n${report}`);
}

async function globalTeardown() {
  console.log('\n🔄 Running global teardown...');

  try {
    // Before the pattern cleanup below, which would hide what the specs left.
    const leakCheck = await collectLeaks();
    await cleanupAllTestData();
    await runSqlCleanup();
    // Leftovers of earlier runs that died before their own cleanup ran.
    const stale = await sweepStaleTestData(getSupabaseClient());
    console.log('🧹 Stale test data swept:', stale.deleted);
    for (const error of stale.errors) console.error('❌ Stale sweep:', error);
    reportLeaks(leakCheck);
    console.log('✅ Global teardown completed\n');
  } catch (error) {
    // A refusal to touch production is NOT a cleanup failure to be swallowed —
    // it means the suite was aimed at the live database and the run should stop
    // being treated as normal. Swallowing it is how the 2026-08-06 deletion of
    // six production profiles would have gone unnoticed in the log noise.
    if ((error as { isTestDataLeak?: boolean })?.isTestDataLeak) throw error;
    if ((error as { isProductionRefusal?: boolean })?.isProductionRefusal) {
      console.error(`\n${(error as Error).message}\n`);
      throw error;
    }
    console.error('❌ Error during global teardown:', error);
    // Don't fail the test run if cleanup fails
    // This ensures test results are still reported
  }
}

export default globalTeardown;
