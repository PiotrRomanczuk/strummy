'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { loadAuthedProfile } from '@/lib/auth/loadAuthedProfile';
import { loadViewAsTarget } from '@/lib/auth/view-as';
import { VIEW_AS_COOKIE, VIEW_AS_MAX_AGE_SECONDS } from '@/lib/auth/view-as.constants';
import { createLogger } from '@/lib/logger';
import { getServerForceRemote } from '@/lib/supabase/provider-preference';
import { createClient } from '@/lib/supabase/server';

const log = createLogger('view-as');

/**
 * The REAL account behind the request. Deliberately not getUserWithRolesSSR(),
 * which reports the previewed student while a preview is active.
 */
async function realAdminProfileId(): Promise<string | null> {
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) return null;
  const authed = await loadAuthedProfile(data.user, { forceRemote: await getServerForceRemote() });
  return authed?.roles.isAdmin ? authed.profileId : null;
}

/** Admin only: open the dashboard as this student sees it, read-only, for an hour. */
export async function startViewAsStudent(studentProfileId: string): Promise<{ error: string }> {
  const adminId = await realAdminProfileId();
  if (!adminId) return { error: 'Only an admin can preview a student' };
  const target = await loadViewAsTarget(studentProfileId, await getServerForceRemote());
  if (!target) return { error: 'This profile is not an active student' };

  (await cookies()).set(VIEW_AS_COOKIE, target.profileId, {
    path: '/',
    maxAge: VIEW_AS_MAX_AGE_SECONDS,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false, // the browser Supabase client reads it to refuse writes
  });
  log.info('[view-as] started', { adminId, studentId: target.profileId });
  redirect('/dashboard');
}

/** Leave the preview and go back to the student's page. Works for anyone. */
export async function stopViewAsStudent(): Promise<void> {
  const store = await cookies();
  const studentId = store.get(VIEW_AS_COOKIE)?.value;
  store.delete(VIEW_AS_COOKIE);
  log.info('[view-as] stopped', { studentId });
  redirect(studentId ? `/dashboard/users/${encodeURIComponent(studentId)}` : '/dashboard');
}
