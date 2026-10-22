import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { VIEW_AS_COOKIE } from '@/lib/auth/view-as.constants';

import { getSupabaseConfig } from './config';
import { viewAsGuardedFetch } from './view-as-fetch';

/**
 * If using Fluid compute: Don't put this client in a global variable. Always create a new client within each
 * function when using it.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const forceRemote = cookieStore.get('sb-provider-preference')?.value === 'remote';
  const { url, anonKey } = getSupabaseConfig({ forceRemote });
  // Admin "view as student" preview: refuse every write (lib/supabase/view-as-fetch.ts).
  const isViewingAs = Boolean(cookieStore.get(VIEW_AS_COOKIE)?.value);

  return createServerClient(url, anonKey, {
    global: { fetch: viewAsGuardedFetch(() => isViewingAs) },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
