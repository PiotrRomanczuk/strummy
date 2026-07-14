import { createAdminClient } from '@/lib/supabase/admin';
import { createLogger } from '@/lib/logger';

const log = createLogger('link-shadow-user');

export interface TransferResult {
  updatedProfile: Record<string, unknown>;
  counts: Record<string, number>;
}

/**
 * Claim a shadow profile for a real auth user via the atomic SQL function
 * `claim_shadow_profile()` — the same function the `handle_new_user` trigger
 * uses. It inserts the real profile FIRST (copying all shadow attributes),
 * transfers every FK reference via `transfer_shadow_profile_references()`,
 * deletes the shadow, and logs `shadow_link_completed` — all in ONE
 * transaction, so a mid-step failure can never leave half-moved references.
 *
 * (Replaces the previous three non-atomic app-side steps, which also ran in
 * the wrong order: FK transfer before the target profile row existed.)
 */
export async function transferShadowReferences(
  supabase: ReturnType<typeof createAdminClient>,
  shadowId: string,
  realUserId: string,
  shadowProfile: { email: string; full_name: string | null },
  realEmail: string
): Promise<TransferResult> {
  const rpcFn = supabase.rpc as (...args: unknown[]) => ReturnType<typeof supabase.rpc>;
  const { data: transferCounts, error: rpcError } = await rpcFn('claim_shadow_profile', {
    p_old_profile_id: shadowId,
    p_new_user_id: realUserId,
    p_new_email: realEmail,
  });

  if (rpcError) {
    throw new Error(`Claim failed: ${rpcError.message}`);
  }

  log.info('Shadow profile claimed atomically', { shadowId, realUserId, counts: transferCounts });

  const { data: newProfile, error: fetchError } = await supabase
    .from('profiles')
    .select()
    .eq('id', realUserId)
    .single();

  if (fetchError) {
    // The claim itself committed — surface the profile-fetch failure without
    // pretending the link failed.
    log.error('Claimed profile fetch failed', fetchError, { realUserId });
  }

  const counts: Record<string, number> =
    typeof transferCounts === 'object' && transferCounts !== null
      ? (transferCounts as Record<string, number>)
      : {};

  return { updatedProfile: newProfile ?? { id: realUserId, email: realEmail }, counts };
}
