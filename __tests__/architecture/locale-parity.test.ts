import { LOCALES } from '@/i18n/locales';
import enMessages from '@/messages/en.json';
import plMessages from '@/messages/pl.json';

/**
 * Locale parity.
 *
 * In next-intl a missing key is a **render-time throw**, not a silent fallback
 * to the default locale — and a missing *namespace* takes the whole page with
 * it. On 2026-08-15 `pl.json` was short 14 keys, including the entire
 * `Dashboard` namespace, so the Polish student dashboard rendered raw key paths
 * ("DASHBOARD.SONGOFTHEWEEK") where the Song of the Week card should have been.
 *
 * Nothing caught it: `npm run lint`, `typecheck` and `check:structure` are all
 * blind to message files, and the E2E suite never switched locale. This test is
 * the check that makes the rule real — per S9, a rule without one is decoration.
 *
 * It compares key SHAPE only, never values: a translation that is deliberately
 * identical across locales ("Status", a brand name) is fine.
 */

type Messages = Record<string, unknown>;

/** Every leaf key path, e.g. `Nav.groups.teaching`. Arrays are leaves. */
function flattenKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value as Messages).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

const en = flattenKeys(enMessages);
const pl = flattenKeys(plMessages);

describe('locale parity', () => {
  it('ships a message file for every declared locale', () => {
    // If a locale is added to LOCALES without a messages file, that locale
    // throws on the very first render rather than falling back.
    expect([...LOCALES].sort()).toEqual(['en', 'pl']);
  });

  it('has no keys missing from pl.json', () => {
    const missing = en.filter((key) => !pl.includes(key)).sort();
    expect(missing).toEqual([]);
  });

  it('has no keys in pl.json that en.json does not declare', () => {
    // The other direction matters too: a stray Polish key is usually a typo or
    // a key that moved namespace, and it silently does nothing.
    const extra = pl.filter((key) => !en.includes(key)).sort();
    expect(extra).toEqual([]);
  });

  it('declares every namespace in both locales', () => {
    // Called out separately because a missing namespace is the worse failure —
    // `Could not resolve 'Dashboard' in messages for locale 'pl'` takes out the
    // whole page, not one string.
    const namespaces = (m: Messages) => Object.keys(m).sort();
    expect(namespaces(plMessages as Messages)).toEqual(namespaces(enMessages as Messages));
  });

  it('has no accidental empty strings standing in for a translation', () => {
    // An empty string is usually a forgotten translation, but not always: the
    // landing headline is assembled as prefix + emphasis + suffix, and Polish
    // word order leaves nothing after the quoted clause where English needs
    // " again." Those two are correct as empty, so they are listed rather than
    // silently tolerated — anything NEW that is blank fails.
    const INTENTIONALLY_EMPTY = [
      'Landing.hero.teacher.headlineSuffix',
      'Landing.hero.student.headlineSuffix',
    ];

    const blanks = Object.entries(flattenEntries(plMessages))
      .filter(([, value]) => typeof value === 'string' && value.trim() === '')
      .map(([key]) => key)
      .filter((key) => !INTENTIONALLY_EMPTY.includes(key));

    expect(blanks.sort()).toEqual([]);
  });
});

/** Leaf key → value, for the blank-string check. */
function flattenEntries(value: unknown, prefix = ''): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? { [prefix]: value } : {};
  }
  return Object.entries(value as Messages).reduce<Record<string, unknown>>(
    (acc, [key, child]) => ({
      ...acc,
      ...flattenEntries(child, prefix ? `${prefix}.${key}` : key),
    }),
    {}
  );
}
