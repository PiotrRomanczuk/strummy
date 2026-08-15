import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    '.vercel/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Project-specific ignores
    'supabase/**',
    'coverage/**',
    // Script files with different module system
    'scripts/**/*.js',
    '*.js',
    // History/backup files
    'scripts/history/**',
    // Test infrastructure dirs
    'tests/**',
    // Claude Code agent worktrees (isolated copies for parallel agents)
    '.claude/**',
    // Active parallel agent worktrees
    'worktrees/**',
  ]),
  // Fix: eslint-plugin-react (bundled by eslint-config-next) uses context.getFilename()
  // which was removed in ESLint 10. Pinning react.version bypasses auto-detection.
  {
    name: 'project/react-version-fix',
    settings: {
      react: { version: '19.0.0' },
    },
  },
  // Allow _-prefixed identifiers to be unused (intentional no-ops)
  {
    name: 'project/underscore-ignore-pattern',
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
  // Project-wide rules and overrides
  {
    name: 'project/component-size-rules',
    files: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
    rules: {
      // Enforce small, focused files (warn — many files still exceed this)
      'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 80, skipBlankLines: true, IIFEs: true }],
      complexity: ['warn', { max: 50 }],
      'max-depth': ['warn', 10],
      // Ban explicit 'any' — use unknown or a proper type. Suppressible per-site
      // with eslint-disable-next-line when Supabase generics make it unavoidable.
      '@typescript-eslint/no-explicit-any': 'error',
      // ADR 0003 §6: route operational logs through @/lib/logger. console.warn/error
      // remain allowed for genuine fallback paths and dev tooling output.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // Enforce API client and hydration safety standards
  {
    name: 'project/restrict-raw-fetch-in-components',
    files: ['components/**/*.{ts,tsx}', 'hooks/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'warn', // Keep as warn for gradual refactoring of pre-existing components
        {
          selector: 'CallExpression[callee.name="fetch"]',
          message:
            'Do not use raw fetch() in client-side code. Use apiClient from "@/lib/api-client" for consistent operations and error handling.',
        },
      ],
    },
  },
  {
    name: 'project/restrict-raw-html-ui-elements',
    files: ['components/**/*.tsx'],
    ignores: ['components/ui/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'JSXOpeningElement[name.name="table"]',
          message:
            'Do not use raw <table> tags. Use Table components from "@/components/ui/table" instead.',
        },
        {
          selector: 'JSXOpeningElement[name.name="select"]',
          message:
            'Do not use raw <select> tags. Use Select components from "@/components/ui/select" instead.',
        },
      ],
    },
  },
  {
    name: 'project/hydration-safety-date-formatting',
    files: ['components/**/*.{ts,tsx}', 'app/**/page.tsx', 'app/**/layout.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error', // Keep as error to prevent hydration mismatches in React pages/components
        {
          selector:
            'CallExpression[callee.property.name=/^toLocale(Date|Time)?String$/][arguments.length=0]',
          message:
            'Calling toLocaleDateString(), toLocaleTimeString(), or toLocaleString() without arguments causes hydration mismatches in Next.js. Pass an explicit locale (e.g., "en-US") or wrap in a utility.',
        },
      ],
    },
  },
  {
    name: 'project/restrict-server-supabase-on-client',
    files: ['components/**/*.{ts,tsx}'],
    ignores: ['components/ui/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/supabase/server',
              message:
                'Do not import server-side Supabase client creators in client components. Use the browser client from "@/lib/supabase" instead.',
            },
            {
              name: '@/lib/supabase/admin',
              message:
                'Security restriction: Admin clients cannot be imported or executed on the client side.',
            },
          ],
        },
      ],
    },
  },
  {
    name: 'project/restrict-as-any-casting',
    files: ['components/**/*.{ts,tsx}', 'app/**/*.{ts,tsx}', 'lib/**/*.ts'],
    ignores: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'components/ui/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSAsExpression[typeAnnotation.type="TSAnyKeyword"]',
          message:
            'Do not use "as any" type assertion. Cast to "unknown" first, use type guards, or define proper types.',
        },
      ],
    },
  },
  // Do not apply size rules to generated types, migrations, or tests
  {
    name: 'project/size-rules-exceptions',
    files: [
      'types/**/*.ts',
      'supabase/**/*.{ts,sql}',
      '__tests__/**/*.{ts,tsx}',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
    ],
    rules: {
      'max-lines': 'off',
      'max-lines-per-function': 'off',
      // Tests legitimately spy on console as part of mock assertions.
      'no-console': 'off',
    },
  },
]);

export default eslintConfig;
