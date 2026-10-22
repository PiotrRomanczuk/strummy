import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';

import { createAdminClient } from '@/lib/supabase/admin';

import { VIEW_AS_COOKIE } from './view-as.constants';

export type ViewAsStudent = {
  profileId: string;
  fullName: string | null;
  email: string | null;
  isDevelopment: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The raw cookie value, or null outside a request scope. */
export async function readViewAsCookie(): Promise<string | null> {
  try {
    return (await cookies()).get(VIEW_AS_COOKIE)?.value ?? null;
  } catch {
    return null;
  }
}

/** Only an active, non-deleted student profile can be previewed. */
export const loadViewAsTarget = cache(
  async (profileId: string, forceRemote: boolean): Promise<ViewAsStudent | null> => {
    if (!UUID.test(profileId)) return null;
    const { data, error } = await createAdminClient({ forceRemote })
      .from('profiles')
      .select('id, full_name, email, is_student, is_development, deleted_at')
      .eq('id', profileId)
      .maybeSingle();
    if (error || !data || !data.is_student || data.deleted_at) return null;
    return {
      profileId: data.id,
      fullName: data.full_name,
      email: data.email,
      isDevelopment: data.is_development,
    };
  }
);

/**
 * The student an admin is previewing, or null. `isRealAdmin` must come from the
 * signed-in account itself: a non-admin with the cookie gets no override (only
 * the write block, which harms nobody but themselves).
 */
export async function resolveViewAs(
  isRealAdmin: boolean,
  forceRemote: boolean
): Promise<ViewAsStudent | null> {
  if (!isRealAdmin) return null;
  const profileId = await readViewAsCookie();
  return profileId ? loadViewAsTarget(profileId, forceRemote) : null;
}
