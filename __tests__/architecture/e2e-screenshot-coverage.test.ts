import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Every E2E spec must build on `tests/fixtures`, not on `@playwright/test`
 * directly.
 *
 * The shared fixture carries an `auto` fixture that screenshots the end of
 * every test into `screenshots/e2e/<project>/<spec>/`, so a run across the
 * device projects doubles as a visual record of the whole suite at every
 * screen size. A spec that imports `test` straight from Playwright silently
 * opts out of that, and nothing else would notice.
 *
 * Type-only imports are fine — `import type { Page }` pulls in no runner.
 */

const ROOT = path.join(__dirname, '..', '..');
const E2E_DIR = path.join(ROOT, 'tests', 'e2e');

function specFiles(): string[] {
  return execSync(`find ${JSON.stringify(E2E_DIR)} -name '*.spec.ts'`, { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

/** `import { test } from '@playwright/test'` — but not `import type { … }`. */
const RAW_VALUE_IMPORT = /import\s+(?!type\b)\{[^}]*\btest\b[^}]*\}\s+from\s+'@playwright\/test'/;

describe('E2E screenshot coverage', () => {
  const files = specFiles();

  it('finds the E2E suite where it expects it', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('has no spec importing the runner directly', () => {
    const offenders = files
      .filter((file) => RAW_VALUE_IMPORT.test(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(ROOT, file))
      .sort();

    expect(offenders).toEqual([]);
  });
});
