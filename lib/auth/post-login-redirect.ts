const DEFAULT_PATH = '/dashboard';
const ORIGIN_PROBE = 'http://strummy.invalid';

/**
 * Where to send a user after signing in. proxy.ts and the dashboard pages send
 * unauthenticated visitors to `/sign-in?redirect=<path>`; this reads that back.
 * /auth/callback reads its `next` parameter through it too.
 *
 * Only same-origin paths inside /dashboard are honoured, plus any exact path in
 * `extraPaths` (the callback needs `/reset-password`), so the parameter can
 * never become an open redirect (`//evil.com`, `https://evil.com`, `/\evil.com`,
 * `@evil.com`).
 */
export function postLoginPath(
  raw: string | null | undefined,
  extraPaths: readonly string[] = []
): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) {
    return DEFAULT_PATH;
  }
  let url: URL;
  try {
    url = new URL(raw, ORIGIN_PROBE);
  } catch {
    return DEFAULT_PATH;
  }
  if (url.origin !== ORIGIN_PROBE) return DEFAULT_PATH;
  const isDashboard = url.pathname === DEFAULT_PATH || url.pathname.startsWith(`${DEFAULT_PATH}/`);
  const isAllowed = isDashboard || extraPaths.includes(url.pathname);
  return isAllowed ? `${url.pathname}${url.search}${url.hash}` : DEFAULT_PATH;
}
