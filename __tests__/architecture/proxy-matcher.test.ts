/**
 * @jest-environment node
 */
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';

import { config } from '../../proxy';

/**
 * STR-3: the matcher's "skip anything with a dot" alternative was written
 * `.*..*` instead of `.*\\..*`. Its unescaped middle dot matched any character,
 * so the negative lookahead rejected every non-empty path and the proxy —
 * CSP, X-Frame-Options, the locale cookie, the edge /dashboard redirect — ran
 * on `/` and the explicitly listed `/fretboard` only.
 */
const matches = (url: string) =>
  unstable_doesMiddlewareMatch({ config, url: `http://localhost:3000${url}` });

describe('proxy matcher', () => {
  it.each([
    '/',
    '/dashboard',
    '/dashboard/songs/123',
    '/dashboard/admin/data-quality',
    '/fretboard',
    '/for-teachers',
  ])('runs on %s', (path) => {
    expect(matches(path)).toBe(true);
  });

  it.each([
    '/api/song',
    '/ingest/e',
    '/monitoring',
    '/_next/static/chunks/main.js',
    '/_next/image',
    '/favicon.ico',
    '/logo.png',
    '/email/invite.html',
    '/sign-in',
    '/sign-up',
    '/forgot-password',
  ])('skips %s', (path) => {
    expect(matches(path)).toBe(false);
  });
});
