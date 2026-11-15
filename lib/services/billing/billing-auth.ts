import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';

/**
 * The billing tables have no write policy for signed-in users, so every write
 * goes through the service role. That makes this check the whole access
 * control: it returns the caller's own profile id, and every billing write is
 * pinned to it — a teacher only ever touches their own price list and sales.
 *
 * A plain module, not a server action: exported from a `'use server'` file it
 * would become an endpoint anyone could call.
 */
export async function requireBillingTeacher(): Promise<{ teacherId: string } | { error: string }> {
  const { user, profileId, isAdmin, isTeacher, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };
  if (!user || !profileId) return { error: 'Unauthorized' };
  if (!isAdmin && !isTeacher) return { error: 'Only teachers and admins can manage billing' };
  return { teacherId: profileId };
}
