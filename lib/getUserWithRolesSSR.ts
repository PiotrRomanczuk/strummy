import { createClient } from '@/lib/supabase/server';
import { loadAuthedProfile } from '@/lib/auth/loadAuthedProfile';
import { getServerForceRemote } from '@/lib/supabase/provider-preference';
import { resolveViewAs, type ViewAsStudent } from '@/lib/auth/view-as';

/**
 * Server Component / Server Action adapter for the auth seam.
 *
 * Resolves the cookie-bound user and loads their Profile via the shared loader
 * (`loadAuthedProfile`), which is memoized per request. Returns a flat shape
 * with the empty-roles default when there is no user or no Profile, so existing
 * callers that destructure `{ user, isAdmin, ... }` keep working.
 *
 * Admin "view as student": when the signed-in admin has the view-as cookie set,
 * the identity returned here IS that student (profile id and student-only
 * flags), so every page renders the student's view. `viewAs` says so; `user`
 * stays the admin's auth user. Writes are refused by the Supabase clients while
 * the cookie is set (lib/supabase/view-as-fetch.ts).
 *
 * For new code, prefer `loadAuthedProfile(user)` directly.
 */
export async function getUserWithRolesSSR() {
  const empty = {
    user: null,
    // Empty string, never `user.id`: a caller that filters a profile-id column
    // by an auth id gets zero rows rather than the wrong rows.
    profileId: '',
    isAdmin: false,
    isTeacher: false,
    isStudent: false,
    isParent: false,
    isDevelopment: false,
    viewAs: null as ViewAsStudent | null,
  };

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return empty;

  const forceRemote = await getServerForceRemote();
  const authed = await loadAuthedProfile(user, { forceRemote });
  if (!authed) {
    return { ...empty, user };
  }

  const viewAs = await resolveViewAs(authed.roles.isAdmin, forceRemote);
  if (viewAs) {
    return {
      user: authed.user,
      profileId: viewAs.profileId,
      isAdmin: false,
      isTeacher: false,
      isStudent: true,
      isParent: false,
      isDevelopment: viewAs.isDevelopment,
      viewAs,
    };
  }

  return {
    user: authed.user,
    profileId: authed.profileId,
    isAdmin: authed.roles.isAdmin,
    isTeacher: authed.roles.isTeacher,
    isStudent: authed.roles.isStudent,
    isParent: authed.flags.isParent,
    isDevelopment: authed.flags.isDevelopment,
    viewAs: null,
  };
}
