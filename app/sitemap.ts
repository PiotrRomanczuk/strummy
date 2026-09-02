import type { MetadataRoute } from 'next';

import { PUBLIC_ROUTES, siteUrl } from '@/lib/site';

/**
 * The crawlable surface of the app. Everything else lives behind
 * `/dashboard/*`, which the proxy gates and `robots.ts` disallows.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return PUBLIC_ROUTES.map((path) => ({
    url: siteUrl(path),
    lastModified: now,
    changeFrequency: path === '/' ? ('weekly' as const) : ('monthly' as const),
    // The free tool is the entry point we actively want found, so it sits
    // level with the landing page rather than below it.
    priority: path === '/' || path === '/fretboard' ? 1 : 0.6,
  }));
}
