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

/**
 * Slugify a spec path or test title into a safe, readable path segment.
 * Keeps Polish letters out of filenames — some tooling on other platforms
 * still mangles them — without collapsing distinct titles into one name.
 */
function slug(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .toLowerCase() || 'unnamed'
  );
}

/**
 * The end-of-test capture behind the mandatory screenshot fixture.
 *
 * Deliberately forgiving: a page mid-navigation, an already-closed context or
 * a detached frame must not turn a passing test red. The screenshot is
 * evidence, not an assertion.
 */
export async function captureFinalState(
  page: Page,
  testInfo: { project: { name: string }; titlePath: string[]; file: string; status?: string }
): Promise<void> {
  try {
    const project = testInfo.project.name.replace(/\s+/g, '-');
    const spec = slug(
      testInfo.file
        .split('/')
        .pop()
        ?.replace(/\.spec\.ts$/, '') ?? 'spec'
    );
    const title = slug(testInfo.titlePath.slice(1).join(' '));
    const outcome = testInfo.status && testInfo.status !== 'passed' ? `--${testInfo.status}` : '';

    await page.screenshot({
      path: `${SCREENSHOT_ROOT}/e2e/${project}/${spec}/${title}${outcome}.png`,
      fullPage: false,
      timeout: 8_000,
    });
  } catch {
    // Never fail a test over its own evidence.
  }
}
