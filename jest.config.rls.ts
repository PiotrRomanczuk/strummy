import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

/**
 * Jest config for RLS-real integration tests against a live Supabase instance.
 *
 * Crucially, this config DOES NOT mock `@supabase/supabase-js` — every other
 * test setup in this repo aliases it to a mock, which would defeat the
 * purpose of testing RLS policies.
 *
 * Run via: `npm run test:rls`. Suites auto-skip via `describeIfRls` if no
 * service-role key is available (e.g. on contributor machines without local
 * Supabase running).
 *
 * `setupFiles` loads `.env.local` by hand: next/jest refuses to read it under
 * NODE_ENV=test, which made every suite here skip silently. See
 * lib/testing/rls/jest.setup-env.ts.
 *
 * `next/headers` and `next/cache` are Next's request context, which does not
 * exist in Jest. They map to lib/testing/rls/next-request.ts / next-cache.ts,
 * so a server action called from a test reads the session of the user the test
 * signed in with `actAs()` — a real JWT against the real stack.
 *
 * CI sets RLS_REQUIRED=1: a run without database credentials then fails in
 * global setup instead of skipping every suite and reporting green.
 */

// When running inside a worktree (cwd at .claude/worktrees/<name>/), ignore the
// OTHER worktrees but allow the current one. When running from main, ignore all
// worktrees. A blanket `/.claude/` ignore breaks worktree test runs entirely.
const worktreeMatch = process.cwd().match(/\.claude\/worktrees\/([^/]+)/);
const worktreeIgnorePattern = worktreeMatch
  ? `/\\.claude/worktrees/(?!${worktreeMatch[1]}/)`
  : '/\\.claude/worktrees/';
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'node',
  testTimeout: 30_000,

  setupFiles: ['<rootDir>/lib/testing/rls/jest.setup-env.ts'],
  // Sweep a killed run's leftovers first; delete this run's rows last and fail
  // the run if that is impossible (lib/testing/rls/run-marker.ts).
  globalSetup: '<rootDir>/lib/testing/rls/jest.global-setup.ts',
  globalTeardown: '<rootDir>/lib/testing/rls/jest.global-teardown.ts',

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^next/headers$': '<rootDir>/lib/testing/rls/next-request.ts',
    '^next/cache$': '<rootDir>/lib/testing/rls/next-cache.ts',
  },

  // Coverage locks for code tested here, on the real database, instead of in
  // the mocked unit suite. The `rls` CI job runs with --coverage, so these are
  // enforced there; a local run without --coverage ignores them. Levels are
  // what the real-DB suites reach: what stays uncovered is the fallback for a
  // database error that carries no message, and a failed write the database
  // only produces when it is down — not worth faking a database for.
  collectCoverageFrom: [
    'app/actions/assignment-status.ts',
    'app/actions/billing-purchases.ts',
    'app/actions/lesson-edit.ts',
    'lib/services/billing/*-queries.ts',
  ],
  coverageReporters: ['text'],
  coverageThreshold: {
    // Every collected file has its own lock below; nothing is left for a global one.
    global: {},
    './app/actions/assignment-status.ts': {
      branches: 90,
      functions: 100,
      lines: 90,
      statements: 90,
    },
    './app/actions/billing-purchases.ts': {
      branches: 80,
      functions: 100,
      lines: 94,
      statements: 94,
    },
    './app/actions/lesson-edit.ts': { branches: 90, functions: 100, lines: 100, statements: 100 },
    './lib/services/billing/billing-queries.ts': {
      branches: 70,
      functions: 100,
      lines: 94,
      statements: 94,
    },
    './lib/services/billing/family-billing-queries.ts': {
      branches: 69,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/billing/student-account-queries.ts': {
      branches: 50,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/billing/student-billing-queries.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },

  testMatch: ['<rootDir>/**/*.rls.test.{ts,tsx}'],
  // No bare '/worktrees/' here: it also matched the CURRENT worktree's own path,
  // so `npm run test:rls` found 0 tests from inside any worktree (2026-10-20).
  testPathIgnorePatterns: ['/node_modules/', '/.next/', worktreeIgnorePattern],

  maxWorkers: 1,
  clearMocks: true,

  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
};

export default createJestConfig(config);
