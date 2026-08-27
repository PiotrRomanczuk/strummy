import { execSync } from 'node:child_process';
import path from 'node:path';

import enMessages from '@/messages/en.json';

/**
 * Every message key a component asks for must actually exist.
 *
 * `locale-parity.test.ts` proves en and pl agree with *each other*. It cannot
 * see a key that is missing from **both** — which is exactly what shipped: the
 * student-facing "Request a song" dialog called 13 `Songs.*` keys that were
 * never added to any locale, so production threw ten
 * `MISSING_MESSAGE: Songs.requestSongTitle (en)` errors on every visit to
 * `/dashboard/songs`.
 *
 * The keys looked safe because every call site passed `{ fallback: '...' }`.
 * next-intl has no such option — the second argument is interpolation *values*,
 * so the fallback text was silently discarded and the lookup threw. The option
 * has been removed everywhere; this test stops the pattern coming back by
 * checking usage against the catalogue rather than trusting a fake API.
 *
 * Deliberately limited to literal single-quoted keys resolved from a namespace
 * that is itself a literal. Dynamic keys (`t(stageLabelKey(x))`) are out of
 * scope — catching those needs types, not grep, and the false-positive rate
 * would make the check wallpaper (S9).
 */

const ROOT = path.resolve(__dirname, '../..');
const SEARCH_DIRS = ['app', 'components'];

type Usage = { namespace: string; key: string; file: string };

/** `const t = useTranslations('Songs')` / `await getTranslations('Songs')`. */
const NAMESPACE_RE =
  /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:use|get)Translations\(\s*'([^']+)'/g;
/** `t('someKey')` — first argument only, single-quoted literal. */
const CALL_RE = /\b(\w+)\(\s*'([A-Za-z][\w-]*)'\s*[,)]/g;

function listFiles(): string[] {
  const out = execSync(
    `git -C ${ROOT} ls-files ${SEARCH_DIRS.join(' ')} | grep -E '\\.(ts|tsx)$'`,
    { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
  );
  return out
    .split('\n')
    .filter(Boolean)
    .filter((f) => !/\.(test|spec)\.tsx?$/.test(f));
}

function readFile(relative: string): string {
  return execSync(`cat ${JSON.stringify(path.join(ROOT, relative))}`, {
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });
}

function collectUsages(): Usage[] {
  const usages: Usage[] = [];

  for (const file of listFiles()) {
    const source = readFile(file);
    if (!source.includes('Translations(')) continue;

    // A file may declare several translators — `t` for Lessons plus `tSongs`
    // for Songs in one component, or (as in StudentDetail.Repertoire.tsx) four
    // separate components each naming theirs `t` over a different namespace.
    // So a call resolves to the nearest *preceding* declaration of its own
    // variable name, not simply the last one in the file.
    const declarations = [...source.matchAll(NAMESPACE_RE)].map((m) => ({
      variable: m[1],
      namespace: m[2],
      at: m.index ?? 0,
    }));
    if (declarations.length === 0) continue;

    for (const call of source.matchAll(CALL_RE)) {
      const at = call.index ?? 0;
      const declaration = declarations.filter((d) => d.variable === call[1] && d.at < at).pop();
      if (declaration) usages.push({ namespace: declaration.namespace, key: call[2], file });
    }
  }

  return usages;
}

function hasKey(messages: unknown, dotted: string): boolean {
  let node: unknown = messages;
  for (const segment of dotted.split('.')) {
    if (node === null || typeof node !== 'object') return false;
    node = (node as Record<string, unknown>)[segment];
    if (node === undefined) return false;
  }
  return typeof node === 'string' || typeof node === 'object';
}

describe('locale usage', () => {
  const usages = collectUsages();

  it('finds translator call sites to check', () => {
    // Guards the regexes themselves: if a refactor changes how translators are
    // created, this test must fail loudly rather than pass by matching nothing.
    expect(usages.length).toBeGreaterThan(50);
  });

  it('has an en.json entry for every message key used in app/ and components/', () => {
    const missing = usages
      .filter((u) => !hasKey(enMessages, `${u.namespace}.${u.key}`))
      .map((u) => `${u.namespace}.${u.key} — ${u.file}`);

    expect([...new Set(missing)].sort()).toEqual([]);
  });

  it('never passes a `fallback` option to a translator', () => {
    // next-intl has no `fallback` option. Every occurrence is a missing key
    // wearing a disguise: the text never renders and the lookup throws.
    const offenders = listFiles().filter((file) => {
      const source = readFile(file);
      return /\b\w+\(\s*'[\w-]+'\s*,\s*\{\s*fallback:/.test(source);
    });

    expect(offenders).toEqual([]);
  });
});
