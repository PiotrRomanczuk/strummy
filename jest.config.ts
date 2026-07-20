import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
});

// When running inside a worktree (cwd at .claude/worktrees/<name>/), ignore the
// OTHER worktrees but allow the current one. When running from main, ignore all
// worktrees. A blanket `/.claude/` ignore breaks worktree test runs entirely.
const worktreeMatch = process.cwd().match(/\.claude\/worktrees\/([^/]+)/);
const worktreeIgnorePattern = worktreeMatch
  ? `/\\.claude/worktrees/(?!${worktreeMatch[1]}/)`
  : '/\\.claude/worktrees/';

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',

  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Optimized test timeout
  testTimeout: 15000, // Reduced from 30s for faster execution

  // Module name mapping for absolute imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Mock heavy dependencies for performance
    '^@supabase/supabase-js$': '<rootDir>/lib/testing/__mocks__/supabase.ts',
    '^@/lib/supabase$': '<rootDir>/lib/testing/__mocks__/supabase.ts',
    // Pure-ESM packages: mock instead of transforming the full transitive dep tree
    '^lucide-react$': '<rootDir>/lib/testing/__mocks__/lucide-react.ts',
    '^react-markdown$': '<rootDir>/lib/testing/__mocks__/react-markdown.tsx',
  },

  // Test discovery — `.integration.test.*` and `.e2e.test.*` are excluded via
  // testPathIgnorePatterns below, so plain `*.test.*` files run as unit tests.
  testMatch: [
    '<rootDir>/lib/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/hooks/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/app/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/components/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/schemas/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '<rootDir>/scripts/backfill/**/*.test.{js,jsx,ts,tsx}',
  ],

  // Performance optimizations
  maxWorkers: '50%', // Use half available cores
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  resetMocks: false, // Preserve mocks between tests for performance
  restoreMocks: true,

  // Coverage configuration - Focus on business logic
  coverageReporters: ['text-summary', 'html', 'lcov', 'json-summary'],
  collectCoverageFrom: [
    // Focus on business logic
    'lib/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'app/actions/**/*.{js,jsx,ts,tsx}',
    'components/shared/**/*.{js,jsx,ts,tsx}',
    'schemas/**/*.{js,jsx,ts,tsx}',

    // Exclude non-business logic
    '!**/*.d.ts',
    // Test infrastructure — mocks, fixtures and RLS seed helpers. ~800 lines that
    // exist to test product code, not to be tested themselves.
    '!lib/testing/**',
    // Type-only modules. Babel erases these to an empty module, so v8 reports
    // 0/N lines forever with no way to execute them. Verified 2026-07-20: these
    // contain nothing but `import type` / `type` / `interface`.
    '!**/*.types.ts',
    '!lib/ai/agents/types.ts',
    '!lib/ai/registry/types.ts',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/coverage/**',
    '!**/*.config.{js,ts}',
    '!**/middleware.ts',
    '!app/layout.tsx',
    '!app/page.tsx',
    '!app/global-error.tsx',
    '!**/jest.setup.js',
    '!**/__tests__/**',
    '!**/*.test.{js,jsx,ts,tsx}',
  ],

  // Coverage thresholds for quality gates.
  //
  // Two tiers:
  //  1. `global` — a floor for everything NOT matched by a path key below.
  //     Note Jest REMOVES every path-matched file from the global bucket, so
  //     these numbers describe the remainder, not the whole repo. Measured at
  //     53.6 lines / 77.4 branches / 59.2 functions on 2026-07-20; set a little
  //     under that so ordinary work does not trip the gate.
  //  2. Per-file 100s — the Assignments / Lessons / Songs / Students core
  //     (docs/app-blueprint/91-testing-strategy.md, "Core Coverage Target").
  //     These are locked so the core can never silently regress.
  //
  // Exact file paths, never globs: a Jest path key is a PREFIX match, so
  // './app/actions/song' would also capture song-of-the-week.ts, which is
  // deliberately outside the mandate (roadmap SNG-2, consumer unbuilt) and is
  // not at 100. A key matching zero files is a hard Jest error, so delete the
  // corresponding line whenever you delete a source file.
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 55,
      lines: 50,
      statements: 50,
    },
    // ── app/actions/
    './app/actions/assignment-checklist.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './app/actions/assignment-edit.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './app/actions/assignment-status.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './app/actions/assignment-templates.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './app/actions/assignments.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    './app/actions/lesson-edit.helpers.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './app/actions/lesson-edit.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    './app/actions/repertoire.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    './app/actions/self-rating.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    './app/actions/song-edit.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    './app/actions/song-form.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    './app/actions/song-requests.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './app/actions/songs.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    './app/actions/student-management.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './app/actions/student/dashboard.helpers.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './app/actions/student/dashboard.repertoire.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './app/actions/student/dashboard.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './app/actions/teacher/dashboard.helpers.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    // ── lib/services/
    './lib/services/assignment-detail-queries.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/assignment-list-params.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/assignment-template-queries.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/assignments-queries.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/calendar-lesson-sync.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/lesson-detail-queries.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/lesson-form-data.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/lessons-queries.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/song-detail-queries.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/songs-list-queries.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/student-activity-helpers.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/student-activity-service.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/student-dashboard-queries.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/student-detail-queries.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/teacher-dashboard-backfill-queries.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/teacher-dashboard-queries.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/user.service.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './lib/services/users-list-queries.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    // ── schemas/
    './schemas/AssignmentSchema.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    './schemas/AssignmentTemplateSchema.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './schemas/LessonSchema.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    './schemas/SelfRatingSchema.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    './schemas/SongRequestSchema.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './schemas/SongSchema.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    './schemas/SongVideoSchema.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    './schemas/StudentRepertoireSchema.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './schemas/UserApiSchema.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
    './schemas/UserFavoriteSchema.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './schemas/UserSchema.ts': { branches: 100, functions: 100, lines: 100, statements: 100 },
  },

  // Ignore patterns - Exclude integration tests and sibling worktrees
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/database/',
    worktreeIgnorePattern,
    '.integration.test.',
    '.e2e.test.',
    '.rls.test.',
    '__tests__/auth/credentials.test.ts',
    'scripts/database/shadow-user-linking.test.ts',

    // ─── Quarantined: rotted tests revealed when testMatch was broadened ───
    // Each of these files exists on disk but has not run for some time and
    // currently fails (stale mocks, renamed components, drifted assertions,
    // outdated Supabase query builder shapes). Triage backlog — see
    // tasks/test-coverage-analysis.md §3 and §P0. Remove an entry only after
    // the file passes locally.
  ],

  // Transform files
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },

  // Transform ignore patterns for ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|data-uri-to-buffer|fetch-blob|formdata-polyfill)/)',
  ],

  // Use separate TypeScript config for tests
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
    },
  },

  // Global setup for test environment
  globalSetup: '<rootDir>/lib/testing/jest.global-setup.ts',
  globalTeardown: '<rootDir>/lib/testing/jest.global-teardown.ts',

  // Watch plugins for better developer experience (disabled due to version conflict)
  // watchPlugins: [
  // 	'jest-watch-typeahead/filename',
  // 	'jest-watch-typeahead/testname',
  // ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
