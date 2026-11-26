import 'server-only';
import { randomBytes } from 'node:crypto';
import { secretsMatch } from '@/lib/auth/secret-compare';

/**
 * `state` for the Google consent flow (RFC 6749 §10.12). /api/auth/google
 * stores a fresh random value in this cookie and sends the same value to
 * Google; /api/oauth2/callback accepts a code only when the `state` it comes
 * back with matches the cookie, so a code started in another browser cannot
 * be completed in this one.
 */
export const GOOGLE_OAUTH_STATE_COOKIE = 'strummy_google_oauth_state';

const CALLBACK_PATH = '/api/oauth2/callback';
const MAX_AGE_SECONDS = 10 * 60;

export function newOAuthState(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Scoped to the callback path and short-lived. `Lax` is what lets the cookie
 * ride along on the top-level GET back from Google. `secure` follows the
 * request's scheme: always https in deployed environments, and plain-http
 * `next dev` would otherwise drop the cookie in browsers that do not treat
 * localhost as secure.
 */
export function oauthStateCookieOptions(isHttps: boolean, maxAge = MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax' as const,
    path: CALLBACK_PATH,
    maxAge,
  };
}

/** Constant-time comparison; a missing value on either side never matches. */
export function isOAuthStateValid(
  fromQuery: string | null | undefined,
  fromCookie: string | null | undefined
): boolean {
  return secretsMatch(fromQuery, fromCookie ?? '');
}
