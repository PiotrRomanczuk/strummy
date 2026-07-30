/**
 * Mocks next-intl/server for Jest. The real implementation calls
 * `cookies()` from `next/headers`, which requires an active Next.js request
 * context (AsyncLocalStorage) that doesn't exist in a plain Jest test — it
 * throws outside of one. Tests always run under the fixed 'en' locale (see
 * lib/testing/intl-test-utils.tsx), so this reads messages/en.json directly
 * with a simple dot-path + `{param}` lookup instead of resolving a locale.
 */
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

function makeT(namespace: string) {
  return (key: string, params?: Record<string, string | number>) => {
    let value = resolve(namespace, key);
    if (params) {
      for (const [param, replacement] of Object.entries(params)) {
        value = value.replaceAll(`{${param}}`, String(replacement));
      }
    }
    return value;
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
