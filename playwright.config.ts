import { defineConfig, devices } from '@playwright/test';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

// Load test environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Enforce the "real content, not the error fallback" assertion in the AI specs.
// The app auto-selects OpenRouter when OPENROUTER_API_KEY is set (it is, from
// .env.local) and AI_PREFER_LOCAL is unset — so LLM components are verified by a
// real generation on every run, not just that the wiring fired. Override with a
// different value (e.g. E2E_AI_PROVIDER=ollama) to point at the local LLM instead.
process.env.E2E_AI_PROVIDER ??= 'openrouter';

// Check if local Supabase is running — reads the actual host/port from NEXT_PUBLIC_SUPABASE_LOCAL_URL
// so LAN-hosted stacks (e.g. EliteDesk at 192.168.1.75:54321) are detected correctly.
// Mirrors the same logic in next.config.ts so test helpers use the correct DB.
function isLocalSupabaseRunning(): boolean {
  let host = '127.0.0.1';
  let port = 54321;
  const localUrl = process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL;
  if (localUrl) {
    try {
      const parsed = new URL(localUrl);
      host = parsed.hostname;
      port = parsed.port ? Number(parsed.port) : 54321;
    } catch {
      // Fall back to defaults on unparseable URL
    }
  }
  try {
    execSync(`nc -z ${host} ${port} 2>/dev/null`, { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

if (process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL && !isLocalSupabaseRunning()) {
  console.log(`[Playwright] Local Supabase not detected, using REMOTE configuration`);
  delete process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY;
  delete process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY;
  delete process.env.NEXT_PUBLIC_API_BASE_URL_LOCAL;
}

// Load test credentials
const testCredentials = {
  TEST_ADMIN_EMAIL: 'admin@dev.local',
  TEST_ADMIN_PASSWORD: 'test123_admin',
  TEST_STUDENT_EMAIL: 'student@dev.local',
  TEST_STUDENT_PASSWORD: 'test123_student',
  TEST_TEACHER_EMAIL: 'teacher@dev.local',
  TEST_TEACHER_PASSWORD: 'test123_teacher',
  TEST_PARENT_EMAIL: 'parent@dev.local',
  TEST_PARENT_PASSWORD: 'test123_parent',
};

// Set environment variables for test access
Object.entries(testCredentials).forEach(([key, value]) => {
  if (!process.env[key]) {
    process.env[key] = value;
  }
});

/**
 * Playwright Configuration
 * Matches Cypress settings for seamless migration
 * - Viewport: 1280x720 (default), plus mobile/tablet devices
 * - BaseURL: http://localhost:3000
 * - Timeout: 30000ms (increased for auth flows)
 * - Retries: 2 in CI, 0 locally
 * - Screenshot on failure
 *
 * Run tests on specific devices:
 * - npm run playwright:run -- --project="iPhone 12"
 * - npm run playwright:run -- --project="iPad Pro"
 * - npm run playwright:run -- --project="Desktop Chrome"
 *
 * Run on all devices:
 * - npm run playwright:run
 */
/**
 * A base URL that is not localhost means the target is already running
 * somewhere else, so Playwright must not try to start one.
 */
const isExternalBaseUrl = (() => {
  const base = process.env.PLAYWRIGHT_BASE_URL;
  if (!base) return false;
  try {
    const { hostname } = new URL(base);
    return hostname !== 'localhost' && hostname !== '127.0.0.1';
  } catch {
    return false;
  }
})();

/**
 * How many `--project` flags this run was given. Playwright has no API for it
 * at config time, so read argv — the alternative is a fixed worker count that
 * is either too slow for one project or too aggressive for four.
 */
const selectedProjectCount = process.argv.filter(
  (arg) => arg === '--project' || arg.startsWith('--project=')
).length;

export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts/,

  // Global teardown - cleanup test data after all tests
  globalTeardown: './tests/global-teardown.ts',

  // Timeout configuration - increased for auth flows
  timeout: 30 * 1000,
  expect: {
    timeout: 10 * 1000,
  },

  // Output configuration
  outputDir: 'test-results',

  // Run tests in parallel for speed
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry configuration (matches Cypress)
  retries: process.env.CI ? 2 : 0,

  // Locally every project shares ONE Next.js server, so concurrency is bounded
  // by that server, not by the machine. Two workers is fine for a single
  // project; running several device projects at once pushes client-side
  // navigations past their 10s waits and produces failures that look like app
  // bugs and are not — a four-width run failed two different specs on two
  // different devices, and the same suite passed 40/40 serially.
  //
  // So: one worker as soon as more than one project is selected.
  workers: process.env.CI ? '50%' : selectedProjectCount > 1 ? 1 : 2,

  // Reporter configuration
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Screenshot and video on failure
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    // Viewport size matching Cypress
    viewport: { width: 1280, height: 720 },

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot EVERY test (not just failures): each run doubles as a
    // browsable visual record of every covered surface per device project —
    // open the HTML report and every test carries its final-state capture.
    screenshot: 'on',

    // Video on failure
    video: 'retain-on-failure',

    // Action timeout
    actionTimeout: 15 * 1000,

    // Navigation timeout
    navigationTimeout: 30 * 1000,
  },

  // Configure projects for different browsers and devices
  projects: [
    // Desktop browsers
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'Desktop Firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'Desktop Safari',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 },
      },
    },

    // Mobile devices
    {
      // Chromium, like the other phone projects: WebKit's system deps need
      // sudo on this host and the runner, so the WebKit-defaulting descriptors
      // failed to launch at all — a project that cannot start is worse than an
      // emulated one, because it looks like coverage and provides none.
      name: 'iPhone 12',
      use: {
        ...devices['iPhone 12'],
        browserName: 'chromium',
      },
    },
    // Small-phone floor projects — students sign in from whatever device they
    // own; teacher/admin flows are primarily exercised on iPhone 17 Pro Max.
    // Chromium engine on both (no WebKit build for the runner's Ubuntu 25.10).
    {
      name: 'iPhone SE',
      use: {
        ...devices['iPhone SE'],
        browserName: 'chromium',
      },
    },
    {
      name: 'Galaxy S8',
      use: {
        ...devices['Galaxy S8'],
      },
    },
    {
      name: 'iPhone 15 Pro Max',
      use: {
        ...devices['iPhone 15 Pro Max'],
      },
    },
    {
      // Not in Playwright's registry yet — the 15 Pro Max descriptor supplies
      // the mobile UA/touch flags; viewport bumped to the 17 Pro Max's 440×956.
      // Chromium engine: WebKit's system deps need sudo on the self-hosted
      // runner (npx playwright install-deps webkit); emulation covers
      // layout/touch/viewport, which is what this project exists to test.
      name: 'iPhone 17 Pro Max',
      use: {
        ...devices['iPhone 15 Pro Max'],
        browserName: 'chromium',
        viewport: { width: 440, height: 956 },
      },
    },

    // Tablet
    {
      // 'iPad Pro' is NOT a name in Playwright's device registry (verified
      // against 1.58.2 — the registry has 'iPad Pro 11'). `...devices[missing]`
      // spreads to `{}` without throwing, so this project silently ran DESKTOP
      // chromium at the global 1280x720 and tested nothing tablet-shaped while
      // reporting green. Chromium engine for the same reason as the iPhone
      // projects below: WebKit's system deps need sudo on the self-hosted
      // runner, and emulation is what covers layout/touch/viewport.
      name: 'iPad Pro',
      use: {
        ...devices['iPad Pro 11'],
        browserName: 'chromium',
      },
    },
    {
      name: 'iPad (gen 7)',
      use: {
        ...devices['iPad (gen 7)'],
      },
    },
  ],

  // Web server configuration
  // Start Next.js dev server before running tests
  // Only boot a local server when the tests are actually pointed at one.
  // Aiming PLAYWRIGHT_BASE_URL at a deployed origin (staging, or strummy.online
  // to smoke a release) used to start `npm run dev` anyway and then fail the
  // whole run on "Timed out waiting 120000ms from config.webServer" — before a
  // single test against the deployment had run.
  ...(isExternalBaseUrl
    ? {}
    : {
        webServer: {
          command: 'npm run dev',
          url: 'http://localhost:3000',
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000,
          stdout: 'ignore' as const,
          stderr: 'pipe' as const,
        },
      }),
});
