import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/site';

/**
 * Crawl the public pages, never the app. `/dashboard/*` needs a session and
 * `/api/*` is not content; both only waste crawl budget and risk indexing a
 * sign-in redirect under a real page's title.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard/', '/api/', '/auth/'] }],
    sitemap: siteUrl('/sitemap.xml'),
    host: siteUrl(),
  };
}
