import fs from 'node:fs';
import path from 'node:path';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { test as authTest } from '../../fixtures';
import { suppressDemoTour } from '../../helpers/demo-tour';
import { settle } from '../../helpers/screenshot';
import { SHOTS, type Shot, type ShotRole, type ShotViewport } from './product-walkthrough.shots';

/**
 * Product walkthrough capture — the screenshots behind
 * `docs/product-walkthrough/` (the Polish screen-by-screen document).
 *
 * Opt-in: lives in tests/e2e/manual/, never part of the default run.
 * Re-run a subset with `WALKTHROUGH_ONLY=t-home,s-home`.
 *
 * Phone shots are taken at 2× device scale so they print sharply at ~85 mm
 * wide; the auth fixture only logs in once per role and the cached session is
 * reused in a fresh context per viewport (the fixture's context cannot change
 * its scale factor after creation).
 */

const OUT = 'docs/product-walkthrough/shots';
const AUTH_DIR = path.join(__dirname, '..', '..', '.auth');

const VIEWPORTS: Record<ShotViewport, { width: number; height: number; scale: number }> = {
  phone: { width: 390, height: 844, scale: 2 },
  desktop: { width: 1440, height: 900, scale: 1 },
  tabletPortrait: { width: 834, height: 1112, scale: 1 },
  tabletLandscape: { width: 1112, height: 834, scale: 1 },
};

const only = (process.env.WALKTHROUGH_ONLY ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const wanted = (shot: Shot) => only.length === 0 || only.includes(shot.id);

async function openContext(
  browser: Browser,
  role: ShotRole,
  viewport: ShotViewport
): Promise<BrowserContext> {
  const vp = VIEWPORTS[viewport];
  const storage = path.join(AUTH_DIR, `${role}.json`);
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.scale,
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    storageState: role === 'public' ? undefined : storage,
  });
  await context.addCookies([{ name: 'NEXT_LOCALE', value: 'pl', url: 'http://localhost:3000' }]);
  return context;
}

/**
 * Dev-only UI that would mislead a reader: Next.js dev badge, DB indicator,
 * quick-login, and the demo-tour replay bubble (a demo-account affordance,
 * not product chrome — it covered a CTA on 40+ shots of edition 1).
 */
async function hideDevChrome(page: Page): Promise<void> {
  await page.evaluate(() => {
    document
      .querySelectorAll(
        'nextjs-portal, [data-testid="db-connection-indicator"], [data-testid="demo-tour-replay"]'
      )
      .forEach((el) => el.remove());
    document.querySelector('[data-testid="dev-login-admin"]')?.closest('div.mb-4')?.remove();
  });
}

async function capture(page: Page, shot: Shot): Promise<void> {
  if (shot.path) await page.goto(shot.path, { waitUntil: 'domcontentloaded' });
  if (shot.before) await shot.before(page);
  await settle(page, shot.selector);
  await hideDevChrome(page);
  await page.screenshot({ path: `${OUT}/${shot.id}.png`, fullPage: shot.full ?? false });
}

const roles: ShotRole[] = ['public', 'demo', 'demoStudent'];

authTest.describe.serial(
  'Product walkthrough capture',
  { tag: ['@manual', '@screenshots'] },
  () => {
    authTest.setTimeout(20 * 60_000);
    authTest.beforeAll(() => fs.mkdirSync(OUT, { recursive: true }));

    for (const role of roles) {
      authTest(`${role} screens`, async ({ page, loginAs, browser }) => {
        const shots = SHOTS.filter((s) => s.role === role && wanted(s));
        authTest.skip(shots.length === 0, 'nothing selected for this role');
        if (role !== 'public') {
          await suppressDemoTour(page);
          await loginAs(role);
        }
        const failures: string[] = [];
        for (const viewport of Object.keys(VIEWPORTS) as ShotViewport[]) {
          const batch = shots.filter((s) => s.viewport === viewport);
          if (batch.length === 0) continue;
          const context = await openContext(browser, role, viewport);
          const tab = await context.newPage();
          await suppressDemoTour(tab);
          for (const shot of batch) {
            try {
              await capture(tab, shot);
              console.log(`  ✓ ${shot.id}`);
            } catch (error) {
              failures.push(`${shot.id}: ${(error as Error).message.split('\n')[0]}`);
              console.log(`  ✗ ${shot.id}`);
            }
          }
          await context.close();
        }
        if (failures.length > 0) console.log(`\nFailed shots:\n  ${failures.join('\n  ')}`);
      });
    }
  }
);
