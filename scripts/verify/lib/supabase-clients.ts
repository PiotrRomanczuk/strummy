import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Tech debt: lib/testing/rls/clients.ts is the source of truth but its sibling
// env.ts eagerly references Jest's `describe` global at module load, which
// throws ReferenceError outside Jest. When that coupling is split, delete this
// file and import from lib/testing/rls/clients directly.

type Env = { supabaseUrl: string; serviceRoleKey: string; anonKey: string };

function readEnv(): Env {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'http://127.0.0.1:54321';
  // LOCAL preferred over remote — this CLI targets the local stack.
  // The remote keys are kept in env for the Next dev server / production builds.
  const serviceRoleKey =
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY (or LOCAL variant) is required');
  if (!anonKey) throw new Error('NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY (or variant) is required');
  return { supabaseUrl, serviceRoleKey, anonKey };
}

export function createServiceClient(): SupabaseClient {
  const env = readEnv();
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signInAs(email: string, password: string): Promise<SupabaseClient> {
  const env = readEnv();
  const client = createClient(env.supabaseUrl, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signInAs(${email}) failed: ${error.message}`);
  return client;
}
