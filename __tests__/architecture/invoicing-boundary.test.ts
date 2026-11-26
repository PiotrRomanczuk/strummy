/**
 * @jest-environment node
 */
/**
 * lib/invoicing/ is a self-contained inFakt client that may move to a shared
 * package (BIL-11). It may import only itself, `zod` and node built-ins: no
 * Supabase, no `@/` alias, no other Strummy module. Anything else makes the
 * extraction a rewrite instead of a copy.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'lib', 'invoicing');
const IMPORT_PATTERN = /(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+)['"]([^'"]+)['"]/g;

function isAllowed(specifier: string, fileDir: string): boolean {
  if (specifier.startsWith('.')) {
    const target = path.resolve(fileDir, specifier);
    return target === ROOT || target.startsWith(`${ROOT}${path.sep}`);
  }
  const bare = specifier.replace(/^node:/, '');
  return specifier === 'zod' || specifier.startsWith('node:') || builtinModules.includes(bare);
}

export function findForeignImports(source: string, fileDir: string): string[] {
  return [...source.matchAll(IMPORT_PATTERN)]
    .map((match) => match[1])
    .filter((specifier) => !isAllowed(specifier, fileDir));
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('lib/invoicing boundary', () => {
  it('imports nothing but itself, zod and node built-ins', () => {
    const files = listSourceFiles(ROOT);
    expect(files.length).toBeGreaterThan(0);

    const violations = files.flatMap((file) =>
      findForeignImports(readFileSync(file, 'utf8'), path.dirname(file)).map(
        (specifier) => `${path.relative(process.cwd(), file)} -> ${specifier}`
      )
    );

    expect(violations).toEqual([]);
  });

  it('detects imports from outside the library', () => {
    const source = [
      "import { z } from 'zod';",
      "import { createHmac } from 'node:crypto';",
      "import { a } from './infakt-types';",
      "import { logger } from '@/lib/logger';",
      "import { createClient } from '@supabase/supabase-js';",
      "import { b } from '../services/billing/billing-auth';",
      "const lazy = await import('@/lib/env');",
    ].join('\n');

    expect(findForeignImports(source, ROOT)).toEqual([
      '@/lib/logger',
      '@supabase/supabase-js',
      '../services/billing/billing-auth',
      '@/lib/env',
    ]);
  });
});
