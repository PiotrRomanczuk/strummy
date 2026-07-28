import 'server-only';
import { cache } from 'react';
import type { User } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

export type Role = 'admin' | 'teacher' | 'student';

export type Roles = {
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
};

export type Flags = {
  isParent: boolean;
  isDevelopment: boolean;
};

export type AuthedProfile = {
  user: User;
  roles: Roles;
  flags: Flags;
};

type ProfileRow = {
  id: string;
  is_admin: boolean | null;
  is_teacher: boolean | null;
  is_student: boolean | null;
  is_parent: boolean | null;
  is_development: boolean | null;
};

// Uses the service-role client so the lookup works for Bearer-authenticated
// requests (cookie-only server client returns null because the bearer JWT
// context never reaches it). RLS bypass is safe here — authUserId comes from a
// Supabase-validated JWT in authenticateRequest, and we only read public
// role flags that are otherwise visible to the user themselves under RLS.
//
// Matches on `user_id`, NOT `id`. Those were interchangeable until migration
// 20260727110000 ("S2"), which made `handle_new_user` mint the profile with
// `id = gen_random_uuid()` and link it to the account through `user_id`. This
// lookup kept comparing the auth id against the PROFILE id, so every account
// created after that migration resolved to null: no roles, and the dashboard's
// role gate bounced them to /onboarding permanently. Accounts predating S2 are
// unaffected either way — their `user_id` equals their `id`.
// `null` means exactly "this account has no profile row" — the one case the
// dashboard layout may translate into an /onboarding redirect. A failed query
// must NOT collapse into that null: a transient PostgREST/network error would
// silently bounce a fully-authenticated user to onboarding (and withApiAuth
// would 403 them). Infra errors throw instead, so pages hit the error
// boundary and API routes 500 — loud, retryable, and honest.
const fetchProfileRow = cache(
  async (authUserId: string, forceRemote: boolean): Promise<ProfileRow | null> => {
    const supabase = createAdminClient({ forceRemote });
    const { data, error } = await supabase
      .from('profiles')
      .select('id, is_admin, is_teacher, is_student, is_parent, is_development')
      .eq('user_id', authUserId)
      .maybeSingle();
    if (error) {
      throw new Error(`[loadAuthedProfile] profile lookup failed: ${error.message}`);
    }
    return (data as ProfileRow | null) ?? null;
  }
);

export async function loadAuthedProfile(
  user: User,
  options: { forceRemote?: boolean } = {}
): Promise<AuthedProfile | null> {
  const row = await fetchProfileRow(user.id, options.forceRemote ?? false);
  if (!row) return null;
  return {
    user,
    roles: {
      isAdmin: row.is_admin ?? false,
      isTeacher: row.is_teacher ?? false,
      isStudent: row.is_student ?? false,
    },
    flags: {
      isParent: row.is_parent ?? false,
      isDevelopment: row.is_development ?? false,
    },
  };
}

export const ROLE_TO_ROLES_KEY: Record<Role, keyof Roles> = {
  admin: 'isAdmin',
  teacher: 'isTeacher',
  student: 'isStudent',
};

export function hasRole(roles: Roles, role: Role): boolean {
  return roles[ROLE_TO_ROLES_KEY[role]];
}
