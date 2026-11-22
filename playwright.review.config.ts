import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import path from 'node:path';

// The review gallery (tests/review/, scripts/review/README.md). Opt-in: the
// default config only picks up *.spec.ts, so these never run in the suite.
// Both servers are started by scripts/review/run-review.sh; nothing here
// starts one.
dotenv.config({ path: '.env.local' });

const out = path.resolve(process.env.REVIEW_OUT ?? 'review-out');

export default defineConfig({
  testDir: './tests/review',
  testMatch: /.*\.review\.ts/,
  timeout: 10 * 60 * 1000,
  fullyParallel: true,
  workers: 4,
  retries: 0,
  // review-pair.ts writes main's shot as the baseline right before comparing;
  // never let Playwright write one of its own.
  updateSnapshots: 'none',
  snapshotPathTemplate: `${out}/baseline/{projectName}/{arg}{ext}`,
  outputDir: `${out}/test-results`,
  reporter: [['list'], ['json', { outputFile: `${out}/results.json` }]],
  use: {
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
    contextOptions: { reducedMotion: 'reduce' },
    actionTimeout: 15 * 1000,
    navigationTimeout: 45 * 1000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      // Chromium: no WebKit on the runner (see playwright.config.ts).
      name: 'telefon',
      use: { ...devices['iPhone 13'], browserName: 'chromium', deviceScaleFactor: 2 },
    },
  ],
});
