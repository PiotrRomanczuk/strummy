/**
 * Mocks next-intl/server for Jest. The real implementation calls
 * `cookies()` from `next/headers`, which requires an active Next.js request
 * context (AsyncLocalStorage) that doesn't exist in a plain Jest test — it
 * throws outside of one. Tests run under the 'en' locale by default (see
 * lib/testing/intl-test-utils.tsx; `__setMockLocale('pl')` switches one test),
 * so this reads messages/<locale>.json directly with a dot-path lookup instead
 * of resolving a locale, and formats the result
 * with intl-messageformat — the same ICU engine next-intl uses — so plurals and
 * selects (`{count, plural, one {# piece} other {# pieces}}`) render as they do
 * in the app rather than leaking raw ICU syntax into assertions.
 */
import { IntlMessageFormat } from 'intl-messageformat';
import enMessages from '@/messages/en.json';
import plMessages from '@/messages/pl.json';

type Messages = typeof enMessages;

const MESSAGES: Record<string, unknown> = { en: enMessages, pl: plMessages };
let mockLocale = 'en';

/**
 * Switch the mock to another locale for a test that renders a server component
 * in Polish. Defaults to 'en'; call `__setMockLocale('en')` in `afterEach`.
 */
export function __setMockLocale(locale: 'en' | 'pl'): void {
  mockLocale = locale;
}

function resolve(namespace: string, key: string): string {
  const path = `${namespace}.${key}`.split('.');
  let value: unknown = MESSAGES[mockLocale];
  for (const segment of path) {
    value = (value as Record<string, unknown> | undefined)?.[segment];
  }
  if (typeof value !== 'string') {
    throw new Error(`[next-intl mock] Missing message for key "${path.join('.')}"`);
  }
  return value;
}

/** Plain `{param}` substitution — the fallback for strings ICU cannot parse. */
function interpolate(value: string, params?: Record<string, string | number>): string {
  if (!params) return value;
  let out = value;
  for (const [param, replacement] of Object.entries(params)) {
    out = out.replaceAll(`{${param}}`, String(replacement));
  }
  return out;
}

function makeT(namespace: string) {
  const t = (key: string, params?: Record<string, string | number>) => {
    const value = resolve(namespace, key);
    if (!value.includes('{')) return value;
    try {
      return String(new IntlMessageFormat(value, mockLocale).format(params ?? {}));
    } catch {
      return interpolate(value, params);
    }
  };
  /** Like next-intl's `t.has`: whether the key exists, without throwing. */
  t.has = (key: string) => {
    try {
      resolve(namespace, key);
      return true;
    } catch {
      return false;
    }
  };
  return t;
}

export async function getTranslations(namespace: string) {
  return makeT(namespace);
}

export async function getLocale(): Promise<string> {
  return mockLocale;
}

/** The parts of next-intl's formatter the app uses, under the mock's locale ('en' unless a test switched it). */
export async function getFormatter() {
  return {
    dateTime: (date: Date, options?: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat(mockLocale, options).format(date),
    number: (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(mockLocale, options).format(value),
  };
}

export async function getMessages(): Promise<Messages> {
  return enMessages;
}
