/**
 * @jest-environment node
 */
/**
 * No module under lib/ is a Server Action file. A `'use server'` directive
 * turns every export of the module into a public endpoint that any client may
 * call with arguments of its choosing, and lib/ services take ids (`userId`,
 * `profileId`) on trust and often run on the admin client. Server-side helpers
 * use `import 'server-only'`; a client that needs one goes through a thin
 * action in app/actions/ that derives the caller from the session.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(process.cwd(), 'lib');
const DIRECTIVE_LINE = /^\s*['"]use server['"];?\s*$/m;

export function hasUseServerDirective(source: string): boolean {
  return DIRECTIVE_LINE.test(source);
}

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : listSourceFiles(full);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe('lib/ has no Server Action modules', () => {
  it("no file under lib/ declares 'use server'", () => {
    const files = listSourceFiles(ROOT);
    expect(files.length).toBeGreaterThan(0);

    const offenders = files
      .filter((file) => hasUseServerDirective(readFileSync(file, 'utf8')))
      .map((file) => path.relative(process.cwd(), file));

    expect(offenders).toEqual([]);
  });

  it('detects the directive at file level and inside a function', () => {
    expect(hasUseServerDirective("'use server';\n\nexport async function a() {}")).toBe(true);
    expect(hasUseServerDirective('/** doc */\n\n"use server"\nexport const x = 1;')).toBe(true);
    expect(hasUseServerDirective("async function a() {\n  'use server';\n}")).toBe(true);
  });

  it('ignores the words in prose and the server-only import', () => {
    expect(hasUseServerDirective("// not a 'use server' module\nimport 'server-only';")).toBe(
      false
    );
  });
});
