import { test, expect } from '../../fixtures';

import { apiPathFor, listApiRoutes } from '../../helpers/api-routes';
import { isDeployedRun, isProductionAppUrl } from '../../helpers/deployed-target';

/**
 * Every API endpoint refuses a visitor with no credentials — @security.
 *
 * No mocks: plain HTTP against the running app and its database. Each route
 * file under `app/api` is read from disk, and every method it exports is
 * called with no cookie, no bearer token, no API key, no cron secret and no
 * webhook signature. The answer must be 401 or 403. A route added without
 * authentication fails this spec the day it lands.
 *
 * Endpoints that answer a visitor with something else on purpose — public
 * ones, and ones that are switched off on this machine — are listed below with
 * the reason and the statuses a visitor may get, so a change shows too.
 * Not run against a deployed app: if a route were open, an anonymous POST
 * would really run there.
 */

const ANONYMOUS_EXCEPTIONS: Record<string, { why: string; anonymous: number[] }> = {
  'GET health/live': { why: 'liveness probe for monitoring', anonymous: [200] },
  'GET auth/google': {
    why: 'only redirects to Google consent (500 where Google OAuth is not configured); oauth2/callback checks the session',
    anonymous: [307, 500],
  },
  'GET oauth2/callback': {
    why: 'Google OAuth return; without a session it redirects to sign-in',
    anonymous: [307],
  },
  'GET spotify/callback': {
    why: 'Spotify OAuth return for the admin token handoff; redirects with an error',
    anonymous: [307],
  },
  'GET notifications/unsubscribe': {
    why: 'one-click unsubscribe from an e-mail; needs its HMAC token',
    anonymous: [400, 401, 403],
  },
  'POST webhooks/calcom': {
    why: 'Cal.com webhook; HMAC signature, fails closed (500) without the secret',
    anonymous: [401, 500],
  },
  'POST webhooks/google-calendar': {
    why: 'Google push notification; channel token checked',
    anonymous: [400, 401, 403],
  },
  // labApiGuard: 404 wherever the private data hub is absent (CI, Vercel), admin-only elsewhere.
  'GET admin/lab/alphatab/[...path]': {
    why: 'lab API, off without the data hub',
    anonymous: [403, 404],
  },
  'GET admin/lab/tabs/[sha1]/file': {
    why: 'lab API, off without the data hub',
    anonymous: [403, 404],
  },
};

/** Refused: unauthenticated or forbidden. */
const REFUSED = [401, 403];

test.describe('API — anonymous access @security @cross-role', () => {
  test('every endpoint refuses a visitor without credentials', async ({ playwright, baseURL }) => {
    test.skip(isDeployedRun(), 'sends anonymous writes; dev stack only');
    expect(isProductionAppUrl(baseURL ?? ''), 'never against production').toBe(false);
    test.setTimeout(15 * 60_000); // the dev server compiles each route on first hit

    const routes = listApiRoutes();
    const endpoints = routes.flatMap(({ route, methods }) =>
      methods.map((method) => ({ route, method, key: `${method} ${route}` }))
    );
    expect(routes.length).toBeGreaterThan(100);
    expect(routes.filter((r) => r.methods.length === 0).map((r) => r.route)).toEqual([]);
    expect(
      Object.keys(ANONYMOUS_EXCEPTIONS).filter((key) => !endpoints.some((e) => e.key === key)),
      'allowlisted endpoints that no longer exist'
    ).toEqual([]);

    const visitor = await playwright.request.newContext({ baseURL });
    const unexpected: string[] = [];
    for (const { route, method, key } of endpoints) {
      const res = await visitor.fetch(apiPathFor(route), {
        method,
        data: method === 'GET' ? undefined : {},
        maxRedirects: 0,
        failOnStatusCode: false,
      });
      const allowed = ANONYMOUS_EXCEPTIONS[key]?.anonymous ?? REFUSED;
      if (!allowed.includes(res.status())) unexpected.push(`${key} → ${res.status()}`);
    }
    await visitor.dispose();

    expect(unexpected, `${endpoints.length} endpoints in ${routes.length} routes`).toEqual([]);
  });
});
