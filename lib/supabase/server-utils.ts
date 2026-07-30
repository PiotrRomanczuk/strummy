import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database.types';
import { getSupabaseConfig } from './config';
import { logger } from '@/lib/logger';

/**
 * Profile roles interface
 */
export interface UserProfile {
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
}

/**
 * Creates a Supabase server client with proper cookie handling.
 * Use this in API routes to avoid duplicating the cookie setup code.
 *
 * @returns Supabase client configured for server-side usage
 */
export async function createApiClient() {
  const cookieStore = await cookies();
  const config = getSupabaseConfig();

  return createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing user sessions.
        }
      },
    },
  });
}

/**
 * Get or create a user profile with default roles.
 * Returns null if there's an error creating the profile.
 *
 * @param supabase - Supabase client instance
 * @param userId - User's ID
 * @param email - User's email
 * @returns User profile with role flags, or null on error
 */
export async function getOrCreateProfile(
  supabase: Awaited<ReturnType<typeof createApiClient>>,
  userId: string,
  email: string
): Promise<UserProfile | null> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin, is_teacher, is_student')
    .eq('id', userId)
    .single();

  // If no profile exists, create one with default values
  if (profileError?.code === 'PGRST116') {
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        is_admin: false,
        is_student: true,
        is_teacher: false,
      })
      .select('is_admin, is_teacher, is_student')
      .single();

    if (createError) {
      logger.error('[ServerUtils] Error creating profile:', createError);
      return null;
    }

    return {
      isAdmin: newProfile.is_admin,
      isTeacher: newProfile.is_teacher,
      isStudent: newProfile.is_student,
    };
  }

  if (profileError) {
    logger.error('[ServerUtils] Error fetching profile:', profileError);
    // Return a default profile for graceful degradation
    return { isAdmin: false, isTeacher: false, isStudent: true };
  }

  return {
    isAdmin: profile.is_admin,
    isTeacher: profile.is_teacher,
    isStudent: profile.is_student,
  };
}

/**
 * Authenticates a request and returns the user and profile.
 * Returns null values if authentication fails.
 *
 * @param supabase - Supabase client instance
 * @returns Object containing user, profile, and any error
 */
export async function authenticateRequest(supabase: Awaited<ReturnType<typeof createApiClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      profile: null,
      error: 'Unauthorized',
      status: 401 as const,
    };
  }

  const profile = await getOrCreateProfile(supabase, user.id, user.email || '');

  if (!profile) {
    return {
      user,
      profile: null,
      error: 'Error creating user profile',
      status: 500 as const,
    };
  }

  return {
    user,
    profile,
    error: null,
    status: 200 as const,
  };
}

/**
 * Combined utility to create client and authenticate in one call.
 * Use this as the standard pattern in API routes.
 *
 * @returns Object with supabase client, user, profile, and any error
 */
export async function createAuthenticatedClient() {
  const supabase = await createApiClient();
  const auth = await authenticateRequest(supabase);

  return {
    supabase,
    ...auth,
  };
}
