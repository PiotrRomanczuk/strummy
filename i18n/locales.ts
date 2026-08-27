export const LOCALES = ['en', 'pl'] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/**
 * Best locale for an `Accept-Language` header.
 *
 * Shared by `proxy.ts` and `i18n/request.ts` on purpose. The proxy's matcher
 * deliberately skips `/sign-in`, `/sign-up` and `/forgot-password`, so those
 * routes never get a cookie written for them — a visitor whose first click is
 * a direct demo link (`/sign-in?demo=true`) used to fall through to the
 * default locale and read English no matter what their browser asked for.
 * Both layers resolving the header the same way closes that gap.
 */
export function resolveLocaleFromAcceptLanguage(header: string | undefined | null): AppLocale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase();
    if (!tag) continue;
    const base = tag.split('-')[0];
    if (isAppLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
