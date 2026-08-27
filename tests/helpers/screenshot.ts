import { test, type Page } from '@playwright/test';

/**
 * Settle-then-capture, shared by the demo screenshot suites.
 *
 * Lifted out of `demo-screenshots.spec.ts` rather than copied into the mobile
 * journey: two implementations of "wait for the page to stop moving" drift,
 * and the drift shows up as flaky screenshots nobody trusts.
 *
 * Captures are grouped by Playwright project, so a run across three phone
 * widths leaves three comparable sets instead of one set overwritten twice.
 */

/** Root for every capture. Gitignored — these are review artefacts, not assets. */
export const SCREENSHOT_ROOT = 'screenshots';

async function settle(page: Page, selector?: string): Promise<void> {
  await page.waitForLoadState('networkidle');

  if (selector) {
    try {
      await page.waitForSelector(selector, { timeout: 15_000 });
    } catch {
      // The surface may legitimately be empty for this account.
    }
  }

  try {
    await page.waitForFunction(() => document.querySelectorAll('.animate-pulse').length === 0, {
      timeout: 8_000,
    });
  } catch {
    // Some pages keep a pulsing element on purpose.
  }

  await page.waitForTimeout(600);
}

/**
 * Capture one step of a journey.
 *
 * `step` is zero-padded into the filename so the folder reads in the order the
 * journey actually happened — reviewing a phone flow means scrolling through
 * it in sequence, and alphabetical order would scramble step 10 above step 2.
 */
export async function captureStep(
  page: Page,
  group: string,
  step: number,
  name: string,
  opts?: { selector?: string; fullPage?: boolean }
): Promise<string> {
  await settle(page, opts?.selector);

  const project = test.info().project.name.replace(/\s+/g, '-');
  const path = `${SCREENSHOT_ROOT}/${group}/${project}/${String(step).padStart(2, '0')}-${name}.png`;

  await page.screenshot({ path, fullPage: opts?.fullPage ?? false });

  // Attach to the HTML report too, so a reviewer sees the flow inline rather
  // than having to find the folder on the machine that ran it.
  await test.info().attach(`${project} · ${step}. ${name}`, {
    path,
    contentType: 'image/png',
  });

  return path;
}
