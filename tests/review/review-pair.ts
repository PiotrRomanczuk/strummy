import { expect, test, type Browser, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { login } from '../helpers/auth';
import { settle } from '../helpers/screenshot';
import type { ReviewPersona, ReviewStep } from './review-cast';

/**
 * One screen, two builds, the same moment.
 *
 * Each step opens the same URL on `main`'s server and on `test`'s, both signed
 * in as the same person against the same database, and screenshots them back
 * to back. Taking the pair together is the point: run the builds one after the
 * other and a sign-in on the first pass shows up as "last active: now" on the
 * second, a refreshed copy changes every list, and the diff fills with noise
 * that has nothing to do with the code.
 *
 * `main`'s shot is written where `toMatchSnapshot` looks for its baseline, so
 * Playwright's own comparator decides "changed" and draws the diff image.
 * Every step appends one line to manifest.jsonl; scripts/review/build-gallery.mjs
 * turns that into the gallery.
 */

export const REVIEW_OUT = path.resolve(process.env.REVIEW_OUT ?? 'review-out');
const SIDES = ['main', 'test'] as const;
type Side = (typeof SIDES)[number];
const BASE_URL: Record<Side, string | undefined> = {
  main: process.env.REVIEW_MAIN_URL,
  test: process.env.REVIEW_TEST_URL,
};
// Long lists would make a 30 000-pixel image nobody scrolls; the top of a page
// is where a layout change shows.
const MAX_HEIGHT = 4000;
// Anti-aliasing differs a few pixels between two renders of the same page.
const MAX_DIFF_RATIO = 0.002;

type Shot = { file: string; http: number | null; url: string; errors: string[] };
export type ManifestEntry = {
  project: string;
  persona: string;
  personaLabel: string;
  step: number;
  key: string;
  title: string;
  path: string;
  status: 'same' | 'changed' | 'error';
  main: Shot;
  test: Shot;
  diff: string | null;
};

export type Pair = Record<Side, Page>;

export async function openPair(browser: Browser): Promise<Pair> {
  const pages = {} as Pair;
  for (const side of SIDES) {
    const baseURL = BASE_URL[side];
    if (!baseURL) throw new Error(`REVIEW_${side.toUpperCase()}_URL is not set`);
    // Locale, time zone and device come from the project (playwright.review.config.ts).
    const context = await browser.newContext({ baseURL });
    pages[side] = await context.newPage();
  }
  return pages;
}

export async function closePair(pair: Pair): Promise<void> {
  await Promise.all(SIDES.map((side) => pair[side].context().close()));
}

/**
 * Signs both sides in. A side that cannot sign in is not fatal: its screens then
 * show where it ended up, and the step is flagged — a build that locks the
 * person out is exactly what the review is for.
 */
export async function signInPair(pair: Pair, persona: ReviewPersona): Promise<void> {
  if (!persona.credentials) return;
  const credentials = persona.credentials;
  await Promise.allSettled(SIDES.map((side) => login(pair[side], credentials)));
}

// REVIEW_LANG=pl (the default) asks every page for Polish, whatever the
// person's saved preference; REVIEW_LANG= keeps each person's own language.
const LANG = process.env.REVIEW_LANG ?? 'pl';

function withLang(url: string): string {
  if (!LANG) return url;
  const u = new URL(url, 'http://review.invalid');
  u.searchParams.set('lang', LANG);
  return `${u.pathname}${u.search}`;
}

async function open(page: Page, url: string): Promise<Omit<Shot, 'file'>> {
  const errors: string[] = [];
  const onError = (e: Error) => errors.push(e.message.slice(0, 300));
  page.on('pageerror', onError);
  const response = await page
    .goto(withLang(url), { waitUntil: 'domcontentloaded' })
    .catch(() => null);
  // A page that keeps polling never reaches networkidle; shoot what is there.
  await settle(page).catch(() => undefined);
  page.off('pageerror', onError);
  return { http: response?.status() ?? null, url: new URL(page.url()).pathname, errors };
}

// Lazy images below the fold load only once scrolled to, so a full-page shot
// races them: in a trial run one song cover was blank on main and drawn on
// test. Load every image (up to 5 s) before either side is shot.
async function loadImages(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const pending = [...document.images].map((img) => {
      img.loading = 'eager';
      if (img.complete) return null;
      return new Promise((done) => {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
    });
    await Promise.race([Promise.all(pending), new Promise((done) => setTimeout(done, 5000))]);
  });
}

async function shoot(page: Page): Promise<Buffer> {
  await loadImages(page);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const width = page.viewportSize()?.width ?? 1280;
  return page.screenshot({
    fullPage: true,
    clip: { x: 0, y: 0, width, height: Math.min(height, MAX_HEIGHT) },
    animations: 'disabled',
    caret: 'hide',
    // Values that differ between two renders a second apart (a clock, "2 min ago").
    mask: [page.locator('[data-review-mask]')],
  });
}

function relative(file: string): string {
  return path.relative(REVIEW_OUT, file).split(path.sep).join('/');
}

export async function capturePair(
  pair: Pair,
  persona: ReviewPersona,
  index: number,
  step: ReviewStep
): Promise<ManifestEntry> {
  const info = test.info();
  const project = info.project.name;
  const name = `${persona.key}-${String(index).padStart(2, '0')}-${step.key}`;
  const dir = path.join(REVIEW_OUT, 'shots', project);
  fs.mkdirSync(dir, { recursive: true });

  const [mainOpen, testOpen] = await Promise.all(SIDES.map((side) => open(pair[side], step.path)));
  const [mainPng, testPng] = await Promise.all(SIDES.map((side) => shoot(pair[side])));
  const files = {
    main: path.join(dir, `${name}-main.png`),
    test: path.join(dir, `${name}-test.png`),
  };
  fs.writeFileSync(files.main, mainPng);
  fs.writeFileSync(files.test, testPng);

  // The baseline Playwright compares against is main's shot of this very step.
  const baseline = info.snapshotPath(`${name}.png`);
  fs.mkdirSync(path.dirname(baseline), { recursive: true });
  fs.writeFileSync(baseline, mainPng);
  let diff: string | null = null;
  let isChanged = false;
  try {
    expect(testPng).toMatchSnapshot(`${name}.png`, { maxDiffPixelRatio: MAX_DIFF_RATIO });
  } catch {
    isChanged = true;
    const drawn = info.attachments.find((a) => a.name === `${name}-diff.png`)?.path;
    if (drawn && fs.existsSync(drawn)) {
      diff = path.join(dir, `${name}-diff.png`);
      fs.copyFileSync(drawn, diff);
    }
  }

  const isBroken = (s: Omit<Shot, 'file'>) =>
    (s.http ?? 500) >= 400 ||
    s.errors.length > 0 ||
    (!!persona.credentials && /sign-in/.test(s.url));
  const entry: ManifestEntry = {
    project,
    persona: persona.key,
    personaLabel: persona.label,
    step: index,
    key: step.key,
    title: step.title,
    path: step.path,
    status: isBroken(testOpen) ? 'error' : isChanged ? 'changed' : 'same',
    main: { file: relative(files.main), ...mainOpen },
    test: { file: relative(files.test), ...testOpen },
    diff: diff ? relative(diff) : null,
  };
  fs.appendFileSync(path.join(REVIEW_OUT, 'manifest.jsonl'), `${JSON.stringify(entry)}\n`);
  return entry;
}
