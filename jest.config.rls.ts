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
