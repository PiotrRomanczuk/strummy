/**
 * Mocks next-intl/server for Jest. The real implementation calls
 * `cookies()` from `next/headers`, which requires an active Next.js request
 * context (AsyncLocalStorage) that doesn't exist in a plain Jest test — it
 * throws outside of one. Tests always run under the fixed 'en' locale (see
 * lib/testing/intl-test-utils.tsx), so this reads messages/en.json directly
 * with a dot-path lookup instead of resolving a locale, and formats the result
 * with intl-messageformat — the same ICU engine next-intl uses — so plurals and
 * selects (`{count, plural, one {# piece} other {# pieces}}`) render as they do
 * in the app rather than leaking raw ICU syntax into assertions.
 */
import { IntlMessageFormat } from 'intl-messageformat';
import enMessages from '@/messages/en.json';

type Messages = typeof enMessages;

function resolve(namespace: string, key: string): string {
  const path = `${namespace}.${key}`.split('.');
  let value: unknown = enMessages;
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
  return (key: string, params?: Record<string, string | number>) => {
    const value = resolve(namespace, key);
    if (!value.includes('{')) return value;
    try {
      return String(new IntlMessageFormat(value, 'en').format(params ?? {}));
    } catch {
      return interpolate(value, params);
    }
  };
}

export async function getTranslations(namespace: string) {
  return makeT(namespace);
}

export async function getLocale(): Promise<string> {
  return 'en';
}

export async function getMessages(): Promise<Messages> {
  return enMessages;
}
