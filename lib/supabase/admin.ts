import { createClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';
import { getSupabaseAdminConfig } from './config';

export function createAdminClient(options: { forceRemote?: boolean } = {}) {
  const { url, serviceRoleKey } = getSupabaseAdminConfig(options);

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
