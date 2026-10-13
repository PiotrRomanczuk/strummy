/**
 * In-App Notifications Server Actions
 *
 * UI-facing server actions for notification bell and notification center.
 * These actions are called from client components.
 */

'use server';

import { revalidatePath } from 'next/cache';
import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import {
  getUserNotifications as serviceGetUserNotifications,
  markAsRead as serviceMarkAsRead,
  markAllAsRead as serviceMarkAllAsRead,
  getUnreadCount as serviceGetUnreadCount,
  type InAppNotification,
  type GetUserNotificationsOptions,
} from '@/lib/services/in-app-notification-service';

/**
 * `in_app_notifications.profile_id` is a PROFILE id. Since S2
 * (20260727110000) that is not the auth id, so every action here resolves
 * the caller's profile from the session instead of trusting `user.id` —
 * which is exactly what the inbox page, the bell and mark-read all did until
 * 2026-10-13, and why a seeded inbox rendered "No notifications" while the
 * topbar badge (already on profileId) counted 2.
 */
async function currentProfileId(): Promise<string | null> {
  const { user, profileId } = await getUserWithRolesSSR();
  return user && profileId ? profileId : null;
}

/**
 * Get in-app notifications for a profile (`profiles.id`, not the auth id).
 */
export async function getInAppNotifications(
  userId: string,
  options?: GetUserNotificationsOptions
): Promise<InAppNotification[]> {
  const notifications = await serviceGetUserNotifications(userId, options);
  return notifications;
}

/**
 * Mark a single notification as read. Ownership is derived from the caller's
 * session, not a client-supplied id — the underlying update runs on the admin
 * client, so this is the only guard against marking another user's row.
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const profileId = await currentProfileId();
  if (!profileId) return false;

  const success = await serviceMarkAsRead(notificationId, profileId);

  if (success) {
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/notifications');
  }

  return success;
}

/**
 * Mark all notifications as read for a user. `userId` must match the caller's
 * own session — see markNotificationAsRead for why.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  const profileId = await currentProfileId();
  if (!profileId || profileId !== userId) return false;

  const success = await serviceMarkAllAsRead(userId);

  if (success) {
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/notifications');
  }

  return success;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return await serviceGetUnreadCount(userId);
}
