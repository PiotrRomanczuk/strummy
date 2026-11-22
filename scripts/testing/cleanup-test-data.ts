#!/usr/bin/env tsx

/**
 * Manual Test Data Cleanup Script
 *
 * Run this script to manually clean up test data from the database.
 * Useful for cleaning up after failed test runs or interrupted test sessions.
 *
 * Usage:
 *   npm run test:cleanup
 *   or
 *   npx tsx scripts/testing/cleanup-test-data.ts
 */

import { cleanupAllTestData } from '../../tests/helpers/cleanup';

async function main() {
  console.log('🧹 Manual Test Data Cleanup\n');
  console.log('This will delete all test data (songs, lessons, assignments) from the database.');
  console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

  // Give user a chance to cancel
  await new Promise(resolve => setTimeout(resolve, 3000));

  await cleanupAllTestData();

  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
