/**
 * Structured Logger for Notification System
 *
 * Provides consistent, structured logging for all notification operations.
 * Log levels: DEBUG, INFO, WARNING, ERROR
 *
 * Features:
 * - Structured log format with context
 * - Optional Sentry integration for errors
 * - Environment-aware (verbose in dev, concise in prod)
 * - Type-safe context objects
 */

import type { NotificationType } from '@/types/notifications';

// ============================================================================
// TYPES
// ============================================================================

export type LogLevel = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

export interface LogContext {
  user_id?: string;
  notification_id?: string;
  notification_type?: NotificationType;
  lesson_id?: string;
  assignment_id?: string;
  entity_type?: string;
  entity_id?: string;
  recipient_email?: string;
  retry_count?: number;
  error_code?: string;
  scheduled_for?: string;
  retry_after?: number;
  batch_size?: number;
  processed_count?: number;
  failed_count?: number;
  [key: string]: string | number | boolean | undefined | null;
}

interface StructuredLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const isDevelopment = process.env.NODE_ENV === 'development';
const isVerbose = process.env.LOG_VERBOSE === 'true';
const hasSentry = Boolean(process.env.SENTRY_DSN);

// ============================================================================
// LOG FORMATTING
// ============================================================================

/**
 * Format a structured log entry for console output
 */
function formatLog(log: StructuredLog): string {
  const { timestamp, level, message, context, error } = log;

  // Base format: [timestamp] [level] message
  let output = `[${timestamp}] [${level}] ${message}`;

  // Add context if present
  if (context && Object.keys(context).length > 0) {
    const contextStr = Object.entries(context)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
      .join(' ');

    if (contextStr) {
      output += ` | ${contextStr}`;
    }
  }

  // Add error details if present
  if (error) {
    output += `\n  Error: ${error.name}: ${error.message}`;
    if (isDevelopment && error.stack) {
      output += `\n${error.stack}`;
    }
  }

  return output;
}

/**
 * Create a structured log object
 */
function createLog(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): StructuredLog {
  const log: StructuredLog = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };

  if (context && Object.keys(context).length > 0) {
    log.context = context;
  }

  if (error) {
    log.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return log;
}

// ============================================================================
// SENTRY INTEGRATION
// ============================================================================

/**
 * Send error to Sentry if configured
 */
function sendToSentry(error: Error, context?: LogContext): void {
  if (!hasSentry) return;

  try {
    // Dynamic import to avoid build errors if Sentry not installed
    import('@sentry/node').then((Sentry: { captureException: (error: Error, options: Record<string, unknown>) => void }) => {
      Sentry.captureException(error, {
        tags: {
          source: 'notification-system',
          notification_type: context?.notification_type,
        },
        extra: context,
      });
    }).catch(() => {
      // Fail silently if Sentry not available
    });
  } catch {
    // Fail silently if Sentry not available
  }
}

// ============================================================================
// CORE LOGGING FUNCTIONS
// ============================================================================

/**
 * Log a DEBUG level message
 * Only shown in development when LOG_VERBOSE=true
 */
export function logDebug(message: string, context?: LogContext): void {
  if (!isDevelopment || !isVerbose) return;

  const log = createLog('DEBUG', message, context);
  console.log(formatLog(log));
}

/**
 * Log an INFO level message
 * Shown in all environments
 */
export function logInfo(message: string, context?: LogContext): void {
  const log = createLog('INFO', message, context);
  console.log(formatLog(log));
}

/**
 * Log a WARNING level message
 * Shown in all environments
 */
export function logWarning(message: string, context?: LogContext): void {
  const log = createLog('WARNING', message, context);
  console.warn(formatLog(log));
}

/**
 * Log an ERROR level message
 * Shown in all environments, sent to Sentry if configured
 */
export function logError(
  message: string,
  error?: Error,
  context?: LogContext
): void {
  const log = createLog('ERROR', message, context, error);
  console.error(formatLog(log));

  // Send to Sentry if available
  if (error) {
    sendToSentry(error, context);
  }
}

// ============================================================================
// NOTIFICATION-SPECIFIC LOGGING FUNCTIONS
// ============================================================================

/**
 * Log a notification being sent
 */
export function logNotificationSent(
  notificationId: string,
  userId: string,
  type: NotificationType,
  recipientEmail: string,
  additionalContext?: LogContext
): void {
  logInfo('Notification sent successfully', {
    notification_id: notificationId,
    user_id: userId,
    notification_type: type,
    recipient_email: recipientEmail,
    ...additionalContext,
  });
}

/**
 * Log a notification failure
 */
export function logNotificationFailed(
  notificationId: string,
  error: Error,
  userId?: string,
  type?: NotificationType,
  additionalContext?: LogContext
): void {
  logError('Notification failed to send', error, {
    notification_id: notificationId,
    user_id: userId,
    notification_type: type,
    ...additionalContext,
  });
}

/**
 * Log a notification being queued
 */
export function logNotificationQueued(
  notificationId: string,
  userId: string,
  type: NotificationType,
  scheduledFor: string,
  priority: number = 5,
  additionalContext?: LogContext
): void {
  logInfo('Notification queued for delivery', {
    notification_id: notificationId,
    user_id: userId,
    notification_type: type,
    scheduled_for: scheduledFor,
    priority,
    ...additionalContext,
  });
}

/**
 * Log a rate limit being exceeded
 */
export function logRateLimitExceeded(
  userId: string,
  limitType: 'user' | 'system',
  retryAfter: number,
  additionalContext?: LogContext
): void {
  logWarning('Rate limit exceeded', {
    user_id: userId,
    limit_type: limitType,
    retry_after: retryAfter,
    ...additionalContext,
  });
}

/**
 * Log an email bounce
 */
export function logBounce(
  notificationId: string,
  reason: string,
  userId?: string,
  recipientEmail?: string,
  additionalContext?: LogContext
): void {
  logWarning('Email bounced', {
    notification_id: notificationId,
    user_id: userId,
    recipient_email: recipientEmail,
    bounce_reason: reason,
    ...additionalContext,
  });
}

/**
 * Log a notification retry attempt
 */
export function logNotificationRetry(
  notificationId: string,
  retryCount: number,
  nextRetryTime: string,
  userId?: string,
  type?: NotificationType,
  additionalContext?: LogContext
): void {
  logInfo('Notification retry scheduled', {
    notification_id: notificationId,
    user_id: userId,
    notification_type: type,
    retry_count: retryCount,
    next_retry_time: nextRetryTime,
    ...additionalContext,
  });
}

/**
 * Log a notification being moved to dead letter queue
 */
export function logDeadLetter(
  notificationId: string,
  reason: string,
  userId?: string,
  type?: NotificationType,
  additionalContext?: LogContext
): void {
  logWarning('Notification moved to dead letter queue', {
    notification_id: notificationId,
    user_id: userId,
    notification_type: type,
    dead_letter_reason: reason,
    ...additionalContext,
  });
}

/**
 * Log notification batch processing stats
 */
export function logBatchProcessed(
  batchType: 'queue' | 'retry' | 'dead_letter',
  processed: number,
  failed: number,
  totalTime?: number,
  additionalContext?: LogContext
): void {
  logInfo(`Notification batch processed: ${batchType}`, {
    batch_type: batchType,
    processed_count: processed,
    failed_count: failed,
    total_time_ms: totalTime,
    ...additionalContext,
  });
}

/**
 * Log a notification being skipped due to user preferences
 */
export function logNotificationSkipped(
  userId: string,
  type: NotificationType,
  reason: string = 'User preference disabled',
  additionalContext?: LogContext
): void {
  logDebug('Notification skipped', {
    user_id: userId,
    notification_type: type,
    skip_reason: reason,
    ...additionalContext,
  });
}

/**
 * Log cron job start
 */
export function logCronStart(
  jobName: string,
  additionalContext?: LogContext
): void {
  logInfo(`Cron job started: ${jobName}`, {
    cron_job: jobName,
    ...additionalContext,
  });
}

/**
 * Log cron job completion
 */
export function logCronComplete(
  jobName: string,
  duration: number,
  additionalContext?: LogContext
): void {
  logInfo(`Cron job completed: ${jobName}`, {
    cron_job: jobName,
    duration_ms: duration,
    ...additionalContext,
  });
}

/**
 * Log cron job error
 */
export function logCronError(
  jobName: string,
  error: Error,
  additionalContext?: LogContext
): void {
  logError(`Cron job failed: ${jobName}`, error, {
    cron_job: jobName,
    ...additionalContext,
  });
}
