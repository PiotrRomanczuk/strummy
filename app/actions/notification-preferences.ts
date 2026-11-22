'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { guardTestAccountMutation } from '@/lib/auth/test-account-guard';
import { NotificationPreference, NotificationType } from '@/types/notifications';
import { logger } from '@/lib/logger';

/**
 * Result type for server actions
 */
interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Fetch all notification preferences for a user
 *
 * `profileId` is profiles.id — not the auth id. They differ for a student who
 * claimed a shadow profile, and preferences are keyed by profile_id.
 *
 * @param profileId - The profile to fetch preferences for
 * @returns Result with array of notification preferences
 */
export async function getUserNotificationPreferences(
  profileId: string
): Promise<ActionResult<NotificationPreference[]>> {
  // Resolve user + roles via the shared auth seam (memoized per request)
  const { user, profileId: ownProfileId, isAdmin } = await getUserWithRolesSSR();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // RLS check: Users can only access their own preferences.
  // Admins may access any user's preferences (RLS policy permits this).
  if (ownProfileId !== profileId && !isAdmin) {
    return { success: false, error: 'Unauthorized: Cannot access other users preferences' };
  }

  const supabase = await createClient();

  // Fetch preferences with RLS enforcement
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('id, profile_id, notification_type, enabled, created_at, updated_at')
    .eq('profile_id', profileId)
    .order('notification_type', { ascending: true });

  if (error) {
    logger.error('Error fetching notification preferences:', error);
    return { success: false, error: 'Failed to fetch notification preferences' };
  }

  return { success: true, data };
}

/**
 * Update a single notification preference
 *
 * @param profileId - The profile (profiles.id) whose preference to update
 * @param type - The notification type to update
 * @param enabled - Whether the notification should be enabled
 * @returns Result indicating success or failure
 */
export async function updateNotificationPreference(
  profileId: string,
  type: NotificationType,
  enabled: boolean
): Promise<ActionResult> {
  const { user, profileId: ownProfileId, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return guard;

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // RLS check: Users can only modify their own preferences
  if (ownProfileId !== profileId) {
    return { success: false, error: 'Unauthorized: Cannot modify other users preferences' };
  }

  const supabase = await createClient();

  // Update preference (RLS ensures user can only update their own)
  const { error } = await supabase
    .from('notification_preferences')
    .update({ enabled })
    .eq('profile_id', profileId)
    .eq('notification_type', type);

  if (error) {
    logger.error('Error updating notification preference:', error);
    return { success: false, error: 'Failed to update notification preference' };
  }

  revalidatePath('/dashboard/settings');

  return { success: true };
}

/**
 * Bulk enable or disable all notification preferences for a user
 *
 * @param profileId - The profile (profiles.id) whose preferences to update
 * @param enabled - Whether all notifications should be enabled or disabled
 * @returns Result indicating success or failure
 */
export async function updateAllNotificationPreferences(
  profileId: string,
  enabled: boolean
): Promise<ActionResult> {
  const { user, profileId: ownProfileId, isDevelopment } = await getUserWithRolesSSR();
  const guard = guardTestAccountMutation(isDevelopment);
  if (guard) return guard;

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  // RLS check: Users can only modify their own preferences
  if (ownProfileId !== profileId) {
    return { success: false, error: 'Unauthorized: Cannot modify other users preferences' };
  }

  const supabase = await createClient();

  // Bulk update all preferences (RLS ensures user can only update their own)
  const { error } = await supabase
    .from('notification_preferences')
    .update({ enabled })
    .eq('profile_id', profileId);

  if (error) {
    logger.error('Error updating all notification preferences:', error);
    return { success: false, error: 'Failed to update all notification preferences' };
  }

  // Revalidate settings page to reflect changes
  revalidatePath('/dashboard/settings');

  return { success: true };
}
