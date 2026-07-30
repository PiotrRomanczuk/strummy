'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';

const DELETION_GRACE_PERIOD_DAYS = 30;

export async function requestEmailChange(newEmail: string) {
  const { isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  const { error } = await supabase.auth.updateUser({ email: newEmail });

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'This email is already in use by another account.' };
    }
    return { error: error.message };
  }

  return { success: true, message: 'A confirmation email has been sent to your new address.' };
}

export async function requestAccountDeletion() {
  const { isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  const now = new Date();
  const scheduledFor = new Date(now.getTime() + DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

  // `deletion_scheduled_for` was dropped by the July 2026 identity rebuild and
  // nothing reads it — the scheduled date is derived from
  // deletion_requested_at + DELETION_GRACE_PERIOD_DAYS, which is what the
  // caller is told below. `user.id` is an auth id, so match on user_id.
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('profiles')
    .update({
      deletion_requested_at: now.toISOString(),
    })
    .eq('user_id', user.id);

  if (error) {
    return { error: 'Failed to schedule account deletion.' };
  }

  return {
    success: true,
    scheduledFor: scheduledFor.toISOString(),
    message: `Your account is scheduled for deletion on ${scheduledFor.toLocaleDateString()}. You can cancel this at any time.`,
  };
}

export async function cancelAccountDeletion() {
  const { isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return { error: guard.error };

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Unauthorized' };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('profiles')
    .update({
      deletion_requested_at: null,
    })
    .eq('user_id', user.id);

  if (error) {
    return { error: 'Failed to cancel account deletion.' };
  }

  return { success: true, message: 'Account deletion has been cancelled.' };
}

/**
 * Records a sign-in. Currently a no-op: the July 2026 identity rebuild dropped
 * `profiles.sign_in_count` / `last_sign_in_at` and the `increment_sign_in_count`
 * RPC, so there is nowhere to write. Kept as the single call site for sign-in
 * tracking (invoked from both the password and OAuth callback paths) so
 * restoring it later means editing one function, not re-threading the callers.
 * Supabase still records `auth.users.last_sign_in_at` natively.
 */
export async function updateLastSignIn(_userId: string) {
  return;
}
