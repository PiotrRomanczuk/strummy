import { createBrowserClient } from '@supabase/ssr';
import { VIEW_AS_COOKIE } from '@/lib/auth/view-as.constants';

import { getSupabaseConfig } from './config';
import { viewAsGuardedFetch } from './view-as-fetch';

const isBrowserViewingAs = () =>
  typeof document !== 'undefined' &&
  document.cookie.split('; ').some((c) => c.startsWith(`${VIEW_AS_COOKIE}=`));

export function createClient() {
  let forceRemote = false;
  if (typeof document !== 'undefined') {
    const match = document.cookie.match(new RegExp('(^| )sb-provider-preference=([^;]+)'));
    if (match && match[2] === 'remote') {
      forceRemote = true;
    }
  }

  const { url, anonKey } = getSupabaseConfig({ forceRemote });
  return createBrowserClient(url, anonKey, {
    global: { fetch: viewAsGuardedFetch(isBrowserViewingAs) },
  });
}
