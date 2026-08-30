/**
 * Photographs every mounted surface that a Claude Design artboard claims,
 * one shot per manifest entry, and writes a machine-readable ledger beside
 * the images.
 *
 * `.audit.ts`, not `.spec.ts`, for the same reason `prod-cleanup.audit.ts` is:
 * the base config's `testMatch` is `/.*\.spec\.ts/`, so nothing but a run that
 * asks for this file by config can pick it up. It is a capture pass, not a
 * test — it asserts almost nothing, because an audit that stops at the first
 * broken screen photographs one screen.
 *
 * Run it with `playwright.design-capture.config.ts`, which points `testMatch`
 * here and inherits the remote runner's baseURL.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { test, type Page } from '@playwright/test';
import sharp from 'sharp';

import { loginAs } from '../../helpers/dashboard';
import { CAPTURES, VIEWPORTS, type Capture, type Role } from './capture.manifest';

const OUT_DIR = join('screenshots', 'design-audit');

/**
 * Images are re-encoded rather than written straight from Playwright because
 * they have to survive a trip through git to be looked at: a full-page PNG of
 * the landing page is ~6 MB, and thirty of those is a repository nobody wants.
 * 1000px is wide enough to judge layout, hierarchy and spacing — which is all
 * this audit claims to judge — and costs ~200 KB a shot.
 */
const MAX_WIDTH = 1000;
const JPEG_QUALITY = 72;

interface Result {
  id: string;
  mockup: string;
  role: Role;
  viewport: string;
  requested: string;
  finalUrl: string;
  /** The app sent us somewhere else — an access rule, or a missing route. */
  redirected: boolean;
  ok: boolean;
  file: string | null;
  title: string | null;
  heading: string | null;
  /** Rendered height before downscaling — how long the real page is. */
  fullHeight: number | null;
  consoleErrors: string[];
  error: string | null;
}

const results: Result[] = [];

/**
 * Wait for the page to stop moving.
 *
 * A local implementation rather than `tests/helpers/screenshot.ts`'s: that
 * one's `settle` is module-private and its `capture` attaches to the
 * Playwright report and groups by device project, which is a different job
 * from writing one deterministic file per manifest id.
 */
async function settle(page: Page, waitFor?: string): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => {});

  if (waitFor) {
    await page.waitForSelector(waitFor, { state: 'visible', timeout: 15_000 }).catch(() => {});
  }

  // Skeletons pulse forever on a surface that never resolves; not waiting past
  // the budget is deliberate — a shot of a stuck skeleton IS the finding.
  await page
    .waitForFunction(() => document.querySelectorAll('.animate-pulse').length === 0, {
      timeout: 8_000,
    })
    .catch(() => {});

  // Framer Motion entrance animations are ~400ms; catching one mid-flight
  // reads as a layout bug in the report.
  await page.waitForTimeout(900);
}

async function resolveTarget(page: Page, target: Capture['target']): Promise<string> {
  if (typeof target === 'string') return target;

  await page.goto(target.from, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await settle(page);

  // A prefix match alone is not enough, and getting this wrong is silent: every
  // one of these lists puts a "New lesson"/"Add a song"/"Add a student" CTA
  // above the rows, and `/dashboard/lessons/new` matches the prefix
  // `/dashboard/lessons/` perfectly. The first pass of this audit photographed
  // three create forms and filed them as detail views — the capture "succeeded"
  // and the final URL agreed with the resolved one, so nothing flagged it.
  // Requiring the remaining segment to be a UUID is what makes a row a row.
  const rowId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const hrefs = await page
    .locator(`a[href^="${target.hrefPattern}"]`)
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href') ?? ''));

  const href = hrefs.find((h) => rowId.test(h.slice(target.hrefPattern.length).split(/[?#]/)[0]));

  if (!href) {
    throw new Error(
      `no row to open under ${target.hrefPattern} on ${target.from} ` +
        `(${hrefs.length} link(s) matched the prefix, none of them a record id)`
    );
  }
  return href;
}

async function capture(page: Page, entry: Capture): Promise<void> {
  const consoleErrors: string[] = [];
  const onConsole = (msg: { type: () => string; text: () => string }) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 300));
  };
  page.on('console', onConsole);

  const result: Result = {
    id: entry.id,
    mockup: entry.mockup,
    role: entry.role,
    viewport: entry.viewport,
    requested: typeof entry.target === 'string' ? entry.target : `${entry.target.from} → first row`,
    finalUrl: '',
    redirected: false,
    ok: false,
    file: null,
    title: null,
    heading: null,
    fullHeight: null,
    consoleErrors,
    error: null,
  };

  try {
    await page.setViewportSize(VIEWPORTS[entry.viewport]);

    const path = await resolveTarget(page, entry.target);
    // Overwrite the manifest's description with the path actually opened: for
    // a resolved row it is the only record of WHICH row was photographed, and
    // reading "→ first row" in the ledger is how a mis-resolved link stayed
    // invisible on the first pass.
    result.requested = path;
    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await settle(page, entry.waitFor);

    const finalPath = new URL(page.url()).pathname;
    result.finalUrl = finalPath;
    result.redirected = !finalPath.startsWith(path.split('?')[0]);
    result.title = await page.title().catch(() => null);
    result.heading = await page
      .locator('h1')
      .first()
      .innerText({ timeout: 3_000 })
      .then((t) => t.trim().slice(0, 120))
      .catch(() => null);

    const png = await page.screenshot({ fullPage: true, animations: 'disabled' });
    const image = sharp(png);
    const meta = await image.metadata();
    result.fullHeight = meta.height ?? null;

    const file = `${entry.id}.jpg`;
    await image
      .resize({ width: Math.min(MAX_WIDTH, meta.width ?? MAX_WIDTH), withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toFile(join(OUT_DIR, file));

    result.file = file;
    result.ok = true;
    console.log(`  ✓ ${entry.id}  →  ${finalPath}${result.redirected ? '  (REDIRECTED)' : ''}`);
  } catch (error) {
    result.error = error instanceof Error ? error.message.slice(0, 400) : String(error);
    console.log(`  ✗ ${entry.id}  →  ${result.error}`);
  } finally {
    page.off('console', onConsole);
    results.push(result);
  }
}

const ROLES: Role[] = ['anon', 'teacher', 'student', 'admin'];

test.describe.configure({ mode: 'serial' });

for (const role of ROLES) {
  const forRole = CAPTURES.filter((c) => c.role === role);
  if (forRole.length === 0) continue;

  test(`capture ${role} surfaces`, async ({ page }) => {
    // Generous: this is ~10 navigations of a cold production build behind one
    // sign-in, not a test that should be fast.
    test.setTimeout(10 * 60_000);

    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

    if (role !== 'anon') {
      await loginAs(page, role);
    }

    for (const entry of forRole) {
      await capture(page, entry);
    }
  });
}

test.afterAll(() => {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(
    join(OUT_DIR, 'results.json'),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        baseUrl: process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${process.env.E2E_PORT}`,
        total: CAPTURES.length,
        captured: results.filter((r) => r.ok).length,
        results,
      },
      null,
      2
    )
  );
  console.log(`\n[design-audit] ${results.filter((r) => r.ok).length}/${CAPTURES.length} captured`);
});
