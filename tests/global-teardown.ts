import { cleanupAllTestData } from './helpers/cleanup';
import { runSqlCleanup } from './helpers/sql-cleanup';

/**
 * Global Teardown for Playwright Tests
 *
 * Runs after all tests complete to clean up test data.
 * This prevents test data pollution in the database.
 */
async function globalTeardown() {
  console.log('\n🔄 Running global teardown...');

  try {
    await cleanupAllTestData();
    await runSqlCleanup();
    console.log('✅ Global teardown completed\n');
  } catch (error) {
    // A refusal to touch production is NOT a cleanup failure to be swallowed —
    // it means the suite was aimed at the live database and the run should stop
    // being treated as normal. Swallowing it is how the 2026-08-06 deletion of
    // six production profiles would have gone unnoticed in the log noise.
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
