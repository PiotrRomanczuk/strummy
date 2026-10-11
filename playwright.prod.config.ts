import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import baseConfig from './playwright.config';
import { DEPLOYED_ENV_FILE, DEPLOYED_TARGET_ENV } from './tests/helpers/deployed-target';

/**
 * Config for running the suite against a DEPLOYED target (default: production).
 *
 * Differs from playwright.remote.config.ts, which drives a locally started
 * `next start`. Here the tests cross the network to a real deployment and its
 * real database, so what may run is decided here, not by whoever types --grep.
 * See docs/audits/2026-10-11-e2e-prod-safety-audit.md for why each line exists.
 *
 *  - Only tests tagged @prod-safe run. The grep sits on each PROJECT, where a
 *    CLI --grep narrows it further but cannot widen it.
 *  - testIgnore drops specs that mutate shared or other users' data through the
 *    UI alone, so no tag added by mistake can pull them in.
 *  - Any service-role client is refused for the whole run (E2E_DEPLOYED_TARGET,
 *    checked in seed-ids.adminClient): the browser reads the target's DB, so
 *    seeding .env.local's DB is wrong either way.
 *  - Accounts and the target's auth endpoint come from .env.e2e-prod.local
 *    (gitignored), and the preflight signs in THERE (tests/prod-global-setup.ts).
 *  - globalTeardown is removed: it deletes by title/artist pattern, and several
 *    patterns can match genuine records.
 *  - Two projects (desktop + one phone), not ten: every project is one more
 *    full pass of traffic against production.
 */

// override: true so the target's accounts replace the dev.local defaults the
// base config has already filled in.
dotenv.config({ path: DEPLOYED_ENV_FILE, override: true, quiet: true });

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://strummy.online';
process.env[DEPLOYED_TARGET_ENV] = baseURL;

const PROD_SAFE = /@prod-safe/;

export default defineConfig({
  ...baseConfig,
  webServer: undefined,
  globalTeardown: undefined,
  globalSetup: './tests/prod-global-setup.ts',
  testIgnore: [
    '**/e2e/manual/**',
    '**/e2e/integration/**', // creates a lesson + assignment for the first real student
    '**/e2e/ai/**', // real OpenRouter spend; permanent chat rows
    '**/e2e/teacher-full-journey.spec.ts', // UI creates for a real student; cleanup broken
    '**/e2e/student-learning-journey.spec.ts', // completes the first real assignment
    '**/e2e/student/assignments-interact.spec.ts',
    '**/e2e/notifications/**', // "Mark all read" on real notifications
    '**/e2e/cross-role/my-skills.spec.ts', // the three skills specs write the global catalog
    '**/e2e/cross-role/student-skills*.spec.ts',
    '**/e2e/cross-role/rls-data-isolation.spec.ts',
  ],
  use: {
    ...baseConfig.use,
    baseURL,
  },
  projects: [
    {
      name: 'Desktop Chrome',
      grep: PROD_SAFE,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'iPhone 12',
      grep: PROD_SAFE,
      use: { ...devices['iPhone 12'], browserName: 'chromium' },
    },
  ],
});
