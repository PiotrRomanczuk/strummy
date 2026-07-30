/**
 * AI Authentication & Authorization
 *
 * Validates user sessions and enforces role-based access for AI server actions.
 * [BMS-107]
 */

import { createClient } from '@/lib/supabase/server';

export interface AIAuthUser {
  /** The Supabase auth session id (`auth.users.id`), NOT a `profiles.id`. */
  id: string;
  /**
   * `profiles.id` — the value every domain FK is in (lessons.teacher_id,
   * assignments.teacher_id, …). Use this, not `id`, when filtering a
   * profile-id-scoped column.
   */
  profileId: string;
  role: 'admin' | 'teacher' | 'student';
  email: string;
}

export class AIAuthError extends Error {
  public readonly code: 'UNAUTHENTICATED' | 'FORBIDDEN';
  public readonly status: number;

  constructor(code: 'UNAUTHENTICATED' | 'FORBIDDEN', message: string) {
    super(message);
    this.name = 'AIAuthError';
    this.code = code;
    this.status = code === 'UNAUTHENTICATED' ? 401 : 403;
  }
}

/**
 * Require an authenticated user session for AI operations.
 * Fetches the current user from Supabase auth and their role from profiles.
 *
 * @throws {AIAuthError} if no valid session or user not found
 */
export async function requireAIAuth(): Promise<AIAuthUser> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AIAuthError('UNAUTHENTICATED', 'Authentication required to use AI features.');
  }

  // Resolve the caller's own profile row. `profiles.id` is an independent PK
  // from the auth id — the account's row is found via `user_id`, not `id`
  // (see migration 20260727110000 "S2" / lib/auth/loadAuthedProfile.ts).
  //
  // There is also no `role` column on `profiles`: role is derived from the
  // `is_admin` / `is_teacher` / `is_student` boolean flags, matching every
  // other auth helper in this codebase (loadAuthedProfile, getUserWithRolesSSR).
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, is_admin, is_teacher, is_student')
    .eq('user_id', user.id)
    .single();

  const role: AIAuthUser['role'] = profile?.is_admin
    ? 'admin'
    : profile?.is_teacher
      ? 'teacher'
      : 'student';

  return {
    id: user.id,
    profileId: profile?.id || user.id,
    role,
    email: user.email || '',
  };
}

/**
 * Check if a user role is allowed to use a specific agent category.
 */
export function assertAgentAccess(
  userRole: AIAuthUser['role'],
  requiredRoles: readonly string[]
): void {
  if (!requiredRoles.includes(userRole)) {
    throw new AIAuthError(
      'FORBIDDEN',
      `Role '${userRole}' is not permitted to use this AI feature.`
    );
  }
}
