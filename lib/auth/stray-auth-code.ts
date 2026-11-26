/**
 * An auth e-mail link whose redirect URL GoTrue did not accept falls back to
 * its site URL, i.e. `/?code=<uuid>`. The home page ignores the code and the
 * user is left with a marketing page and no explanation. Forwarding the code
 * to `/auth/callback` either completes the sign-in or shows the auth-error
 * page, which explains what to do.
 */
const CODE_FORMAT = /^[A-Za-z0-9-]{16,128}$/;

/** Returns the callback path+query for a stray `/?code=`, or null when not applicable. */
export function strayAuthCodeRedirect(pathname: string, search: string): string | null {
  if (pathname !== '/') return null;
  const code = new URLSearchParams(search).get('code');
  if (!code || !CODE_FORMAT.test(code)) return null;
  return `/auth/callback?code=${encodeURIComponent(code)}`;
}
