import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { VIEW_AS_COOKIE } from '@/lib/auth/view-as.constants';

import { getSupabaseAdminConfig } from './config';
import { viewAsGuardedFetch } from './view-as-fetch';

/**
 * The service-role client has no request of its own, so the view-as check reads
 * the request cookies lazily, on a write only. Outside a request (crons,
 * webhooks, scripts) there is no cookie and nothing is blocked.
 */
async function isRequestViewingAs(): Promise<boolean> {
  try {
    const { cookies } = await import('next/headers');
    return Boolean((await cookies()).get(VIEW_AS_COOKIE)?.value);
  } catch {
    return false;
  }
}

export function createAdminClient(options: { forceRemote?: boolean } = {}) {
  const { url, serviceRoleKey } = getSupabaseAdminConfig(options);

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: { fetch: viewAsGuardedFetch(isRequestViewingAs) },
  });
}
