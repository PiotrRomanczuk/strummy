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
 * runs (it is the net for killed runs, not a spec's cleanup). Reported always; fails the run
 * with E2E_LEAK_CHECK=strict (the nightly, which has the dev stack to itself).
 */
async function collectLeaks(): Promise<Leak[]> {
  const since = process.env.E2E_RUN_STARTED_AT;
  return since ? findLeaks(getSupabaseClient(), since) : [];
}

function reportLeaks(leaks: Leak[]): void {
  const since = process.env.E2E_RUN_STARTED_AT;
  if (leaks.length === 0) return void console.log('🧾 Leak check: nothing left behind');
  const report = `Rows created since ${since} and still there:\n${formatLeaks(leaks)}`;
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `\n### Test data left behind\n\n\`\`\`\n${report}\n\`\`\`\n`
    );
  }
  if (process.env.E2E_LEAK_CHECK === 'strict') throw new TestDataLeak(report);
  console.warn(`⚠️  Leak check — every spec deletes what it creates:\n${report}`);
}

async function globalTeardown() {
  console.log('\n🔄 Running global teardown...');

  try {
    // Before the pattern cleanup below, which would hide what the specs left.
    const leaks = await collectLeaks();
    await cleanupAllTestData();
    await runSqlCleanup();
    // Leftovers of earlier runs that died before their own cleanup ran.
    const stale = await sweepStaleTestData(getSupabaseClient());
    console.log('🧹 Stale test data swept:', stale.deleted);
    for (const error of stale.errors) console.error('❌ Stale sweep:', error);
    reportLeaks(leaks);
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
