/**
 * Email Rate Limiter — Supabase-backed
 *
 * Queries notification_log via Supabase RPC to enforce rate limits.
 * Stateless per invocation — works correctly on Vercel serverless.
 *
 * Limits:
 * - 100 emails/hour per user
 * - 1000 emails/hour system-wide
 */

import { createAdminClient } from '@/lib/supabase/admin';
import {
  logRateLimitExceeded,
  logError,
} from '@/lib/notifications/notification-logger';

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

const USER_LIMIT = 100;
const SYSTEM_LIMIT = 1000;
const WINDOW_SECONDS = 3600; // 1 hour

/**
 * Check if a user has exceeded their hourly email rate limit.
 * Fails open on DB errors (allows send rather than blocking).
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc(
      'get_user_email_count_last_hour' as never,
      { p_user_id: userId } as never
    );

    if (error) {
      logError('Rate limit check failed, failing open', error instanceof Error ? error : new Error(String(error)), { user_id: userId });
      return { allowed: true };
    }

    const count = (data as number) ?? 0;
    if (count >= USER_LIMIT) {
      logRateLimitExceeded(userId, 'user', WINDOW_SECONDS, { current_count: count, limit: USER_LIMIT });
      return { allowed: false, retryAfter: WINDOW_SECONDS };
    }

    return { allowed: true };
  } catch {
    return { allowed: true }; // Fail open
  }
}

/**
 * Check if the system-wide hourly email rate limit has been exceeded.
 * Fails open on DB errors.
 */
export async function checkSystemRateLimit(): Promise<RateLimitResult> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc(
      'get_system_email_count_last_hour' as never
    );

    if (error) {
      logError('System rate limit check failed, failing open', error instanceof Error ? error : new Error(String(error)));
      return { allowed: true };
    }

    const count = (data as number) ?? 0;
    if (count >= SYSTEM_LIMIT) {
      logRateLimitExceeded('system', 'system', WINDOW_SECONDS, { current_count: count, limit: SYSTEM_LIMIT });
      return { allowed: false, retryAfter: WINDOW_SECONDS };
    }

    return { allowed: true };
  } catch {
    return { allowed: true }; // Fail open
  }
}

/**
 * No-op: notification_log INSERT in sendNotification() already records sends.
 */
export async function recordEmailSent(_userId: string): Promise<void> {
  // No-op — the notification_log INSERT in sendNotification() is the source of truth
}

// Export constants for testing
export const __testing__ = {
  USER_LIMIT,
  SYSTEM_LIMIT,
  WINDOW_SECONDS,
};
