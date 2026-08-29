import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { defineConfig } from '@playwright/test';
import prodConfig from './playwright.prod.config';

/**
 * The prod config, plus a full visual record of every run.
 *
 * Used by `.claude/skills/prod-e2e-audit` (`/prod-e2e-audit`). Everything here
 * is either "capture more" or "do not let a dev-stack credential leak into a
 * run aimed at production" — the test selection and the baseURL are
 * playwright.prod.config.ts's business, not this file's.
 *
 * ── Why the env scrub below exists ────────────────────────────────────────
 * playwright.config.ts (imported transitively) calls dotenv on `.env.local`,
 * which on this host points at the LOCAL StudentDevelopment stack. dotenv does
 * not overwrite variables that are already set, so anything the runner script
 * exported survives — but the local-only vars it did NOT export get injected
 * right here, after which lib/supabase/config.ts prefers local and a test
 * helper would read/write the DEV database while the browser drives PRODUCTION.
 * Every assertion built on that mix is a lie in one direction or the other.
 *
 * Module bodies run after imports, so this deletion lands after that dotenv
 * call. Deleting is deliberate: the service-role/direct-Postgres credentials go
 * too. A spec that needs one fails loudly (triage buckets it as a precondition
 * gap) instead of running a bulk DELETE against real student data — the failure
 * mode tests/helpers/cleanup.ts's assertNotProduction() was written for after
 * 2026-08-06.
 */
const LEAKY_VARS = [
  // Local dev stack — the "run against prod but talk to dev" hazard.
  'NEXT_PUBLIC_SUPABASE_LOCAL_URL',
  'NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY',
  'SUPABASE_LOCAL_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_API_BASE_URL_LOCAL',
  // Privileged transports. No audit run needs to bypass RLS or open a psql
  // connection; the ones that would, must not.
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_JWT_SECRET',
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_PASSWORD',
];
for (const key of LEAKY_VARS) delete process.env[key];

// One directory per run, one subdirectory per device project: the triage step
// reads `<runDir>/<slug>/results.json` for each project separately, the way the
// nightly matrix uploads one artifact per leg. A single merged results.json
// would collapse every project into one column and lose which device failed.
const runDir = process.env.E2E_PROD_RUN_DIR || 'test-results/prod-audit/latest';
const slug = process.env.E2E_PROD_PROJECT_SLUG || 'run';

/**
 * The audit's last phase deletes what the run created, through the product's
 * own DELETE endpoints (tests/e2e/prod-cleanup.audit.ts). It is a separate
 * invocation of this config rather than a globalTeardown because it must be
 * REPORTED: a DELETE that fails is a product bug, and a teardown's failures
 * appear in no results.json and reach no triage.
 *
 * The file ends in `.audit.ts` so the normal `*.spec.ts` match can never pick
 * it up — nothing but this phase runs it.
 */
const isCleanup = process.env.E2E_PROD_PHASE === 'cleanup';

/**
 * ── Coverage policy: don't run what cannot pass ────────────────────────────
 *
 * Settled 2026-08-29 (W8 of docs/analysis/2026-08-29-production-e2e-audit.md).
 * Against production, 98 of 351 specs could never pass: 67 need the
 * service-role key this config deletes on purpose, and 31 need an admin
 * account production does not have and arguably should never have. Running
 * them anyway cost ~98 specs × up to 3 attempts of real time, wrote to the
 * production database on the way, and produced a report where "122 failures"
 * meant "119 things we chose not to test".
 *
 * The mechanism is derived, not declared. The audit's own suggestion was to
 * hand-tag the specs (`@requires-admin`, `@requires-service-role`) and grep
 * them out — but that is 57 files in four different `test.describe` shapes,
 * and a tag list is only correct on the day it is written. Reading the same
 * two signals triage classifies on keeps selection and reporting from ever
 * disagreeing, and a new spec that needs a service-role key is deselected the
 * day it is written rather than the day someone remembers to tag it.
 *
 * Deselection is DELIBERATELY NARROW. It never looks at what a spec asserts,
 * only at whether the transport it needs exists on this target — so a genuine
 * product failure can never be silently dropped by it.
 */
/**
 * Does `pattern` appear inside a Playwright lifecycle hook in this source?
 *
 * Brace-matched rather than regexed across the whole file, because the only
 * question that matters is scope: a hook failure aborts every test under its
 * describe, a failure inside one test body aborts that test alone.
 */
function usesInHook(src: string, pattern: RegExp): boolean {
  const hooks = /test\.(beforeAll|beforeEach|afterAll|afterEach)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = hooks.exec(src))) {
    const open = src.indexOf('{', match.index);
    if (open === -1) continue;
    let depth = 0;
    let end = open;
    for (; end < src.length; end++) {
      if (src[end] === '{') depth++;
      else if (src[end] === '}' && --depth === 0) break;
    }
    if (pattern.test(src.slice(open, end))) return true;
  }
  return false;
}

function uncoverableSpecs(): RegExp[] {
  // Only ever applies to a run aimed at a real deployment.
  if (isCleanup) return [];

  const rolesMissing = (process.env.E2E_PROD_ROLES_MISSING ?? '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((r) => r.toLowerCase());
  // LEAKY_VARS deleted this above, so on this config it is always absent —
  // read it anyway rather than hardcoding `true`, so the rule stays honest if
  // the withholding policy is ever revisited.
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const testDir = join(__dirname, 'tests', 'e2e');
  if (!existsSync(testDir)) return [];

  const ignored: RegExp[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.spec.ts')) continue;

      let src = '';
      try {
        src = readFileSync(full, 'utf8');
      } catch {
        continue;
      }

      // Only when the WHOLE file is doomed. A privileged call inside a
      // beforeAll/beforeEach takes every test in its describe down with it, so
      // the file has nothing left to say. A call inside one test body does not
      // — 8 spec files use adminClient in a single test and cover plenty else,
      // and deselecting those would trade a noisy report for silent lost
      // coverage, which is the worse of the two. Those individual failures are
      // classified as coverage gaps by triage.mjs instead.
      const needsServiceRole = !hasServiceRole && usesInHook(src, /\badminClient\s*\(/);
      const needsMissingRole = rolesMissing.some((role) =>
        new RegExp(`loginAs\\(\\s*['"\`]${role}['"\`]`).test(src)
      );

      if (needsServiceRole || needsMissingRole) {
        ignored.push(new RegExp(full.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
      }
    }
  };
  walk(testDir);

  if (ignored.length) {
    // Printed, not silent: a deselected spec is a coverage statement, and a
    // number that appears in no output is a number nobody audits.
    console.log(
      `[prod-capture] deselected ${ignored.length} spec file(s) that cannot pass on this target ` +
        `(no service-role key${rolesMissing.length ? `; no ${rolesMissing.join('/')} account` : ''}).`
    );
  }
  return ignored;
}

export default defineConfig({
  ...prodConfig,

  testMatch: isCleanup ? /prod-cleanup\.audit\.ts$/ : prodConfig.testMatch,

  // See uncoverableSpecs() above. Merged with whatever the prod config already
  // ignores rather than replacing it.
  testIgnore: [
    ...(Array.isArray(prodConfig.testIgnore)
      ? prodConfig.testIgnore
      : prodConfig.testIgnore
        ? [prodConfig.testIgnore]
        : []),
    ...uncoverableSpecs(),
  ],

  outputDir: `${runDir}/${slug}/artifacts`,

  reporter: [
    ['list'],
    ['html', { outputFolder: `${runDir}/${slug}/html`, open: 'never' }],
    ['json', { outputFile: `${runDir}/${slug}/results.json` }],
  ],

  // Explicit, NOT inherited. The base config sets `retries: process.env.CI ? 2
  // : 0`, and this skill runs from a terminal where CI is unset — so without
  // this line every network blip against a real deployment would arrive at
  // triage as a "reproducible failure" and get its own GitHub issue. The
  // failure/flake split downstream is built entirely on Playwright having
  // retried; see scripts/ci/nightly-e2e-report.mjs for the same dependency.
  // Zero in the cleanup phase, and that is not an oversight. A retried DELETE
  // finds the record already deleted by its first attempt, answers "already
  // gone" and passes — so a genuinely broken DELETE would be reported as flaky
  // and quietly dropped by triage. The one place a retry actively hides a bug.
  retries: isCleanup ? 0 : Number(process.env.E2E_PROD_RETRIES ?? 2),

  // The base cap of 2 protects a single local dev server, which is not in this
  // path. 6 is the default rather than the 12 the prod config mentions because
  // tracing every action costs local CPU, and a saturated runner produces
  // timeouts that look like product bugs.
  // One worker for cleanup: the deletions share a ledger and write one
  // cleanup.json from a single afterAll, and concurrent deletes against the
  // same lesson/assignment tree would race each other's ownership checks.
  workers: isCleanup ? 1 : Number(process.env.E2E_PROD_WORKERS ?? 6),

  // Real network + a cold serverless function is slower than localhost. These
  // are the base timeouts roughly doubled; a run that still needs more is
  // telling you something about production, so raise them deliberately.
  timeout: Number(process.env.E2E_PROD_TIMEOUT ?? 60_000),
  expect: { timeout: Number(process.env.E2E_PROD_EXPECT_TIMEOUT ?? 15_000) },

  use: {
    ...prodConfig.use,

    // THE capture setting. `screenshots: true` records a screencast into the
    // trace — a JPEG for every visual change, which is what
    // scripts/extract-frames.mjs turns into the per-action gallery. It is the
    // only mechanism that yields a frame per moment without editing 87 specs.
    trace: {
      mode: 'on',
      screenshots: true,
      snapshots: true,
      // Source files add a copy of the repo's specs to every zip and buy
      // nothing here — the report links file:line instead.
      sources: false,
    },

    // Final-state PNG per test, on top of the screencast (inherited from the
    // base config, restated so a change there cannot silently drop it).
    screenshot: 'on',

    // Off by default: the trace already carries the frames, and a webm per
    // test across a full suite is gigabytes. E2E_PROD_VIDEO=on when a
    // human is going to watch them.
    video: (process.env.E2E_PROD_VIDEO as 'on' | 'retain-on-failure') || 'retain-on-failure',

    actionTimeout: Number(process.env.E2E_PROD_ACTION_TIMEOUT ?? 20_000),
    navigationTimeout: Number(process.env.E2E_PROD_NAV_TIMEOUT ?? 45_000),
  },
});
