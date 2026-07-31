/**
 * Email Bounce Handler
 *
 * Handles email bounces by:
 * - Logging bounced emails in notification_log
 * - Tracking consecutive bounce counts
 * - Auto-disabling notifications after 5 consecutive bounces
 * - Allowing admins to manually re-enable notifications
 */

'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import {
  logBounce,
  logWarning,
  logError,
  logInfo,
} from '@/lib/notifications/notification-logger';
import type { NotificationType } from '@/types/notifications';

// ============================================================================
// BOUNCE HANDLING FUNCTIONS
// ============================================================================

/**
 * Handle a bounced email notification
 * Updates the notification log status to 'bounced' and records the bounce reason
 *
 * @param notificationLogId - ID of the notification log entry
 * @param bounceReason - Reason for the bounce (e.g., "mailbox full", "invalid address")
 * @throws Error if the notification log entry is not found or update fails
 */
export async function handleBounce(
  notificationLogId: string,
  bounceReason: string
): Promise<void> {
  const supabase = createAdminClient();

  // 1. Get the notification log entry
  const { data: logEntry, error: fetchError } = await supabase
    .from('notification_log')
    .select('id, recipient_user_id, recipient_email, notification_type')
    .eq('id', notificationLogId)
    .single();

  if (fetchError || !logEntry) {
    const error = new Error(`Notification log entry not found: ${notificationLogId}`);
    logError('Notification log entry not found', error, {
      notification_id: notificationLogId,
    });
    throw error;
  }

  // 2. Update the log entry status to bounced
  const { error: updateError } = await supabase
    .from('notification_log')
    .update({
      status: 'bounced',
      error_message: bounceReason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', notificationLogId);

  if (updateError) {
    const error = new Error(`Failed to update notification log: ${updateError.message}`);
    logError('Failed to update notification log', error, {
      notification_id: notificationLogId,
      user_id: logEntry.recipient_user_id,
    });
    throw error;
  }

  logBounce(
    notificationLogId,
    bounceReason,
    logEntry.recipient_user_id,
    logEntry.recipient_email,
    { notification_type: logEntry.notification_type as NotificationType }
  );

  // 3. Check consecutive bounce count
  const consecutiveBounces = await checkConsecutiveBounces(logEntry.recipient_user_id);

  // 4. Auto-disable notifications if 5+ consecutive bounces
  if (consecutiveBounces >= 5) {
    logWarning('Auto-disabling notifications due to consecutive bounces', {
      user_id: logEntry.recipient_user_id,
      recipient_email: logEntry.recipient_email,
      consecutive_bounces: consecutiveBounces,
    });

    await disableNotificationsForUser(
      logEntry.recipient_user_id,
      `Auto-disabled after ${consecutiveBounces} consecutive bounces to ${logEntry.recipient_email}`
    );
  }
}

/**
 * Check consecutive bounce count for a user
 * Counts bounces from the most recent notification attempts
 *
 * @param userId - User ID to check bounces for
 * @returns Number of consecutive bounces (0 if last notification was sent successfully)
 */
export async function checkConsecutiveBounces(userId: string): Promise<number> {
  const supabase = createAdminClient();

  // Get recent notification logs ordered by created_at desc
  const { data: logs, error } = await supabase
    .from('notification_log')
    .select('id, status, created_at')
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !logs) {
    logError(
      'Failed to fetch notification logs',
      error instanceof Error ? error : new Error('Failed to fetch notification logs'),
      { user_id: userId }
    );
    return 0;
  }

  // Count consecutive bounces from the most recent
  let consecutiveBounces = 0;
  for (const log of logs) {
    if (log.status === 'bounced') {
      consecutiveBounces++;
    } else if (log.status === 'sent') {
      // Stop counting if we hit a successful send
      break;
    }
    // Continue counting if status is pending, failed, skipped, or cancelled
    // (these don't break the bounce streak)
  }

  return consecutiveBounces;
}

/**
 * Disable all notifications for a user
 * Sets enabled to false on all notification_preferences rows for the user
 *
 * @param userId - User ID to disable notifications for
 * @param reason - Reason for disabling (logged but not stored in DB currently)
 */
export async function disableNotificationsForUser(
  userId: string,
  reason: string
): Promise<void> {
  const supabase = createAdminClient();

  // Disable all notification preferences for the user
  const { error } = await supabase
    .from('notification_preferences')
    .update({ enabled: false })
    .eq('user_id', userId);

  if (error) {
    const err = new Error(`Failed to disable notifications: ${error.message}`);
    logError('Failed to disable notifications', err, {
      user_id: userId,
      reason,
    });
    throw err;
  }

  logInfo('Notifications disabled for user', {
    user_id: userId,
    reason,
  });
}

/**
 * Re-enable notifications for a user (admin only)
 * Sets enabled to true on all notification_preferences rows for the user
 *
 * @param userId - User ID to re-enable notifications for
 * @param adminId - Admin user ID who is re-enabling notifications
 * @throws Error if admin user is not actually an admin
 */
export async function reenableNotificationsForUser(
  userId: string,
  adminId: string
): Promise<void> {
  const supabase = createAdminClient();

  // 1. Verify admin privileges
  const { data: admin, error: adminError } = await supabase
    .from('profiles')
    .select('id, is_admin')
    .eq('id', adminId)
    .single();

  if (adminError || !admin || !admin.is_admin) {
    const error = new Error('Only admins can re-enable notifications');
    logError('Unauthorized re-enable attempt', error, {
      admin_id: adminId,
      user_id: userId,
    });
    throw error;
  }

  // 2. Re-enable all notification preferences for the user
  const { error: updateError } = await supabase
    .from('notification_preferences')
    .update({ enabled: true })
    .eq('user_id', userId);

  if (updateError) {
    const error = new Error(`Failed to re-enable notifications: ${updateError.message}`);
    logError('Failed to re-enable notifications', error, {
      user_id: userId,
      admin_id: adminId,
    });
    throw error;
  }

  logInfo('Notifications re-enabled for user', {
    user_id: userId,
    admin_id: adminId,
  });
}

// ============================================================================
// BOUNCE ANALYTICS & REPORTING
// ============================================================================

/**
 * Get bounce statistics for a user
 *
 * @param userId - User ID to get bounce stats for
 * @returns Object with bounce statistics
 */
export async function getBounceStats(userId: string): Promise<{
  totalBounces: number;
  consecutiveBounces: number;
  lastBounceDate: string | null;
  isDisabled: boolean;
}> {
  const supabase = createAdminClient();

  // Get total bounces
  const { data: bounceLogs, error: bounceError } = await supabase
    .from('notification_log')
    .select('id, created_at')
    .eq('recipient_user_id', userId)
    .eq('status', 'bounced')
    .order('created_at', { ascending: false });

  if (bounceError) {
    const error = new Error(`Failed to fetch bounce logs: ${bounceError.message}`);
    logError('Failed to fetch bounce logs', error, { user_id: userId });
    throw error;
  }

  const totalBounces = bounceLogs?.length || 0;
  const lastBounceDate = bounceLogs?.[0]?.created_at || null;

  // Get consecutive bounces
  const consecutiveBounces = await checkConsecutiveBounces(userId);

  // Check if notifications are disabled (all preferences disabled = notifications disabled)
  const { count, error: prefError } = await supabase
    .from('notification_preferences')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('enabled', true);

  if (prefError) {
    const error = new Error(`Failed to fetch notification preferences: ${prefError.message}`);
    logError('Failed to fetch notification preferences', error, { user_id: userId });
    throw error;
  }

  return {
    totalBounces,
    consecutiveBounces,
    lastBounceDate,
    isDisabled: (count ?? 0) === 0,
  };
}
