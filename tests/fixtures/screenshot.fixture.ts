import { test as base, type Page } from '@playwright/test';

import { captureFinalState } from '../helpers/screenshot';

/**
 * Every E2E test leaves a screenshot, on every device project — no opt-in.
 *
 * `screenshot: 'on'` in playwright.config.ts already attaches one per test,
 * but only inside `test-results/` under hashed directory names, which is
 * fine for reading a failure and useless for reviewing a release across
 * screen sizes. This writes the same moment to a browsable tree instead:
 *
 *   screenshots/e2e/<project>/<spec>/<test>.png
 *
 * It is an `auto` fixture rather than a helper the author remembers to call,
 * because "mandatory if you remember" is not mandatory. Failures inside the
 * capture are swallowed: a screenshot is a review artefact, and letting one
 * fail a green test would teach everyone to distrust the suite.
 */
export type ScreenshotFixtures = {
  autoScreenshot: void;
};

export const withMandatoryScreenshots = base.extend<ScreenshotFixtures>({
  autoScreenshot: [
    async ({ page }, use, testInfo) => {
      await use();

      // A test may close its own page, or never open one.
      if (page.isClosed()) return;
      await captureFinalState(page as Page, testInfo);
    },
    { auto: true },
  ],
});
