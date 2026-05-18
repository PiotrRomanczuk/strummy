import { logger } from '@/lib/logger';
export const getSupabaseConfig = (options: { forceRemote?: boolean } = {}) => {
  const localUrl = process.env.NEXT_PUBLIC_SUPABASE_LOCAL_URL;
  const localAnonKey = process.env.NEXT_PUBLIC_SUPABASE_LOCAL_ANON_KEY;

  const remoteUrl =
    process.env.NEXT_PUBLIC_SUPABASE_REMOTE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const remoteAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_REMOTE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // logger.info('[SupabaseConfig] Checking config:', { options, hasLocalUrl: !!localUrl, hasLocalKey: !!localAnonKey, hasRemoteUrl: !!remoteUrl });

  // Prioritize local if both URL and Key are present, unless forced remote
  if (!options.forceRemote && localUrl && localAnonKey) {
    // logger.info('[SupabaseConfig] Using Local Config');
    return {
      url: localUrl,
      anonKey: localAnonKey,
      isLocal: true,
    };
  }

  // Fallback to remote
  if (remoteUrl && remoteAnonKey) {
    // logger.info('[SupabaseConfig] Using Remote Config');
    return {
      url: remoteUrl,
      anonKey: remoteAnonKey,
      isLocal: false,
    };
  }

  logger.error('[SupabaseConfig] Missing configuration', { localUrl, remoteUrl });
  throw new Error('Supabase configuration missing. Please check your .env file.');
};

export const getSupabaseAdminConfig = (options: { forceRemote?: boolean } = {}) => {
  const config = getSupabaseConfig(options);

  // For admin, we need the service role key.
  // We assume if we are using local URL, we should use local service role key if available.

  const localServiceRoleKey = process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY;
  // SECURITY: Never use NEXT_PUBLIC_ prefix for service role keys - they would be exposed to the client
  const remoteServiceRoleKey =
    process.env.SUPABASE_REMOTE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (config.isLocal && localServiceRoleKey) {
    return {
      ...config,
      serviceRoleKey: localServiceRoleKey,
    };
  }

  if (remoteServiceRoleKey) {
    return {
      ...config,
      serviceRoleKey: remoteServiceRoleKey,
    };
  }

  throw new Error('Supabase Admin configuration missing (Service Role Key).');
};
