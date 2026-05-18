import 'server-only';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'sb-provider-preference';

/**
 * Reads the `sb-provider-preference` cookie used by the local/remote provider
 * toggle and returns `true` when the user has selected the remote provider.
 *
 * Mirrors the behavior of the cookie-bound server client in `lib/supabase/server.ts`
 * so that service-role clients created via `createAdminClient` target the same
 * Supabase environment as the user-bound client within a single request.
 */
export async function getServerForceRemote(): Promise<boolean> {
  try {
    const store = await cookies();
    return store.get(COOKIE_NAME)?.value === 'remote';
  } catch {
    // `cookies()` throws outside a request scope (e.g. background jobs); fall
    // back to the default config selection in that case.
    return false;
  }
}

/**
 * Parse the `sb-provider-preference` value from a raw Cookie header string.
 * Used by API route handlers that receive a `Request` directly.
 */
export function parseForceRemoteFromCookieHeader(header: string | null): boolean {
  if (!header) return false;
  const match = header.match(/(?:^|;\s*)sb-provider-preference=([^;]+)/);
  return match?.[1] === 'remote';
}
