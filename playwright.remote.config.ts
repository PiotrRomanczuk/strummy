import { defineConfig } from '@playwright/test';
import baseConfig from './playwright.config';

// Config for the remote E2E runner (scripts/e2e-remote/). The runner starts its
// own production `next start` on E2E_PORT before invoking Playwright, so no
// webServer is managed here — port 3000 on the EliteDesk is taken by another app.
const port = process.env.E2E_PORT || '3200';

export default defineConfig({
  ...baseConfig,
  webServer: undefined,
  use: {
    ...baseConfig.use,
    baseURL: `http://localhost:${port}`,
  },
});
