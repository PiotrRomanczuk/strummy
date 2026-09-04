/**
 * Absolute origin for the things that must not be relative: canonical URLs,
 * OpenGraph images, sitemap entries.
 *
 * `NEXT_PUBLIC_APP_URL` is already the app's own notion of where it lives (see
 * `lib/services/webhook-renewal.ts`); the fallback is the production domain so
 * a preview build still emits well-formed metadata rather than `undefined/...`.
 */
const FALLBACK_ORIGIN = 'https://strummy.online';

export function siteUrl(path = '/'): string {
  const origin = (process.env.NEXT_PUBLIC_APP_URL || FALLBACK_ORIGIN).replace(/\/+$/, '');
  return path === '/' ? origin : `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Public, crawlable routes — the sitemap and robots policy are built from this. */
export const PUBLIC_ROUTES = ['/', '/fretboard', '/for-teachers', '/privacy'] as const;
