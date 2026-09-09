import { defineConfig } from '@playwright/test';

import remoteConfig from './playwright.remote.config';

/**
 * The design-implementation audit's capture pass.
 *
 * Inherits the remote runner's baseURL (it runs on the EliteDesk, next to the
 * dev Supabase stack — nothing else can reach it), and narrows `testMatch` to
 * the one `.audit.ts` file so this config is the only way that file ever runs.
 *
 * Zero retries on purpose: a capture that failed is a finding to report, and a
 * retry that succeeds on the second attempt would hide a surface that only
 * renders half the time. One worker because every capture drives the same
 * signed-in page in sequence.
 */
export default defineConfig({
  ...remoteConfig,
  testMatch: /capture\.audit\.ts$/,
  retries: 0,
  workers: 1,
  timeout: 10 * 60_000,
  reporter: [['list']],
});
