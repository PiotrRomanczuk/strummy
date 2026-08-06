import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * Config for running the suite against a DEPLOYED target (default: production).
 *
 * Differs from playwright.remote.config.ts, which drives a locally started
 * `next start`. Here the tests cross the network to a real deployment, so:
 *
 *  - no webServer is started or expected;
 *  - baseURL comes from the environment;
 *  - a preflight validates the role accounts before anything runs, instead of
 *    letting every authenticated spec time out (see tests/prod-global-setup.ts);
 *  - globalTeardown is REMOVED. The base config's teardown calls
 *    cleanupAllTestData(), which deletes rows by title/artist pattern — and
 *    several of those patterns are broad enough to match genuine records
 *    (/EDITED$/, /UPDATED$/, 'Test Artist', /^Test Song$/). Pointed at the
 *    production database that is a destructive operation with no undo, so it
 *    does not run here. Clean up deliberately instead.
 *
 * The base config's worker cap does not apply either: it exists to protect a
 * single local Next dev server, which is not in this path. Pass --workers
 * explicitly (12 is comfortable against Vercel).
 */
export default defineConfig({
  ...baseConfig,
  webServer: undefined,
  globalTeardown: undefined,
  globalSetup: './tests/prod-global-setup.ts',
  use: {
    ...baseConfig.use,
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://strummy.online',
  },
});
