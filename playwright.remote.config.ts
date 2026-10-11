import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

// Config for the remote E2E runner (scripts/e2e-remote/). The runner starts its
// own production `next start` on E2E_PORT before invoking Playwright, so no
// webServer is managed here — port 3000 on the EliteDesk is taken by another app.
const port = process.env.E2E_PORT || '3200';

// Fail fast: stop the whole run after this many tests have failed (each after
// its retries). One broken flow otherwise costs the full ~25-minute suite.
// E2E_MAX_FAILURES=0 runs everything, for a complete failure report.
const maxFailures = Number(process.env.E2E_MAX_FAILURES ?? 1);

export default defineConfig({
  ...baseConfig,
  webServer: undefined,
  maxFailures: Number.isFinite(maxFailures) && maxFailures > 0 ? maxFailures : 0,
  use: {
    ...baseConfig.use,
    baseURL: `http://localhost:${port}`,
  },
});
