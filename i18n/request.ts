import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

import { LOCALE_COOKIE, isAppLocale, resolveLocaleFromAcceptLanguage } from './locales';

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieLocale = store.get(LOCALE_COOKIE)?.value;

  // The cookie is the fast path: `proxy.ts` writes it on every route it
  // matches. Its matcher skips the auth pages, though, so a visitor arriving
  // straight at `/sign-in?demo=true` — the shape of link a promo post hands
  // out — has no cookie yet. Fall back to the header rather than to English.
  const locale = isAppLocale(cookieLocale)
    ? cookieLocale
    : resolveLocaleFromAcceptLanguage((await headers()).get('accept-language'));

  const messages = (await import(`../messages/${locale}.json`)).default;

  return { locale, messages };
});
