# Notification System Logging

Structured logging for the notification system with optional Sentry integration.

## Overview

The notification logging system provides:

- **Structured log format** with consistent context fields
- **Multiple log levels**: DEBUG, INFO, WARNING, ERROR
- **Environment-aware** behavior (verbose in dev, concise in prod)
- **Optional Sentry integration** for error tracking
- **Type-safe context** objects for better debugging

## Usage

### Basic Logging

```typescript
import { logInfo, logError, logWarning } from '@/lib/notifications/notification-logger';

// Simple info log
logInfo('Notification sent successfully');

// Log with context
logInfo('Notification sent successfully', {
  notification_id: '123',
  user_id: 'abc',
  notification_type: 'lesson_reminder_24h',
});

// Error logging (automatically sent to Sentry if configured)
logError('Failed to send email', error, {
  notification_id: '123',
  user_id: 'abc',
});
```

### Notification-Specific Functions

The module provides specialized logging functions for common notification operations:

```typescript
import {
  logNotificationSent,
  logNotificationFailed,
  logNotificationQueued,
  logRateLimitExceeded,
  logBounce,
} from '@/lib/notifications/notification-logger';

// Log successful notification
logNotificationSent(
  notificationId,
  userId,
  'lesson_reminder_24h',
  'user@example.com'
);

// Log notification failure
logNotificationFailed(
  notificationId,
  error,
  userId,
  'lesson_reminder_24h'
);

// Log notification queued
logNotificationQueued(
  notificationId,
  userId,
  'lesson_reminder_24h',
  scheduledFor.toISOString(),
  7 // priority
);

// Log rate limit exceeded
logRateLimitExceeded(userId, 'user', 300); // 300 seconds retry after

// Log email bounce
logBounce(notificationId, 'Mailbox full', userId, 'user@example.com');
```

### Cron Job Logging

For cron jobs, use the specialized cron logging functions:

```typescript
import {
  logCronStart,
  logCronComplete,
  logCronError,
} from '@/lib/notifications/notification-logger';

const startTime = Date.now();

try {
  logCronStart('process-notification-queue');

  // ... cron job logic ...

  const duration = Date.now() - startTime;
  logCronComplete('process-notification-queue', duration, {
    processed: 50,
    failed: 2,
  });
} catch (error) {
  logCronError('process-notification-queue', error);
}
```

## Log Levels

### DEBUG
- Only shown in development with `LOG_VERBOSE=true`
- Use for detailed debugging information
- Example: rate limiter state updates

### INFO
- Shown in all environments
- Use for normal operational messages
- Example: notification sent, batch processed

### WARNING
- Shown in all environments
- Use for concerning but non-critical issues
- Example: rate limit exceeded, email bounced

### ERROR
- Always shown, automatically sent to Sentry if configured
- Use for failures that need attention
- Example: failed to send email, database error

## Log Format

Logs are formatted as:

```
[timestamp] [level] message | key1="value1" key2="value2"
```

Example:

```
[2024-01-15T10:30:45.123Z] [INFO] Notification sent successfully | notification_id="abc-123" user_id="user-456" notification_type="lesson_reminder_24h" recipient_email="student@example.com"
```

## Context Fields

Standard context fields used throughout the system:

- `notification_id` - Unique notification log ID
- `user_id` - Recipient user ID
- `notification_type` - Type of notification (e.g., 'lesson_reminder_24h')
- `recipient_email` - Recipient email address
- `lesson_id` - Related lesson ID (if applicable)
- `assignment_id` - Related assignment ID (if applicable)
- `entity_type` - Entity type ('lesson', 'assignment', etc.)
- `entity_id` - Entity ID
- `retry_count` - Number of retry attempts
- `retry_after` - Seconds until retry allowed
- `batch_size` - Size of batch being processed
- `processed_count` - Number of items processed
- `failed_count` - Number of items failed

## Sentry Integration

### Setup

1. Install Sentry SDK:

```bash
npm install @sentry/node
```

2. Set environment variable:

```bash
# .env.local or production environment
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

3. Initialize Sentry in your app (if not already done):

```typescript
// app/sentry.ts or similar
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    // ... other Sentry options
  });
}
```

### How It Works

- **Automatic**: All ERROR level logs are automatically sent to Sentry if `SENTRY_DSN` is configured
- **Context preserved**: All log context fields are included as Sentry "extra" data
- **Tagged**: Errors are tagged with `source: notification-system` and the notification type
- **Graceful**: If Sentry is not configured or fails, logging continues normally

### Viewing in Sentry

Errors will appear in Sentry with:

- **Message**: The error message
- **Tags**: `source`, `notification_type`
- **Extra**: All context fields (user_id, notification_id, etc.)
- **Stack trace**: Full error stack trace

## Environment Variables

```bash
# Development - Show all INFO+ logs
NODE_ENV=development

# Development - Show DEBUG logs
LOG_VERBOSE=true

# Production - Optional Sentry integration
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

## Best Practices

### 1. Use Appropriate Log Levels

```typescript
// ✅ Good
logDebug('Rate limit check passed', { user_id: userId });
logInfo('Notification sent successfully', { notification_id });
logWarning('Rate limit exceeded', { user_id, retry_after });
logError('Failed to send email', error, { notification_id });

// ❌ Bad
logError('User clicked button'); // Not an error
logDebug('Database connection failed'); // Should be ERROR
```

### 2. Include Relevant Context

```typescript
// ✅ Good - Includes context for debugging
logNotificationFailed(notificationId, error, userId, type, {
  entity_type: 'lesson',
  entity_id: lessonId,
  recipient_email: email,
});

// ❌ Bad - Missing context
logNotificationFailed(notificationId, error);
```

### 3. Use Specialized Functions

```typescript
// ✅ Good - Use specialized function
logNotificationSent(notificationId, userId, type, email);

// ❌ Bad - Manual logging
logInfo('Notification sent', {
  notification_id: notificationId,
  user_id: userId,
  // ... manually building context
});
```

### 4. Log at Critical Points

```typescript
// ✅ Good - Log start, progress, and completion
logCronStart('process-queue');
// ... process items ...
logBatchProcessed('queue', processed, failed);
logCronComplete('process-queue', duration, { processed, failed });

// ❌ Bad - Only log at end or not at all
// (makes debugging difficult)
```

## Troubleshooting

### Logs Not Appearing

1. Check `NODE_ENV` - INFO logs only show in development by default
2. For DEBUG logs, ensure `LOG_VERBOSE=true`
3. Check console output - logs use `console.log/warn/error`

### Sentry Errors Not Appearing

1. Verify `SENTRY_DSN` is set correctly
2. Check Sentry is initialized in your app
3. Verify error is logged with `logError()` (not `logInfo` or `logWarning`)
4. Check Sentry project settings and quotas

### Too Verbose

1. Remove `LOG_VERBOSE=true` to hide DEBUG logs
2. Consider adjusting log levels in specific modules
3. In production, logs are automatically more concise

## Migration Guide

If you have existing console.log statements:

### Before

```typescript
console.log(`Sending notification to ${email}`);
console.error('Failed to send:', error);
```

### After

```typescript
logInfo('Sending notification', { recipient_email: email });
logError('Failed to send notification', error, { recipient_email: email });
```

## Future Enhancements

Potential improvements for the logging system:

1. **Structured log aggregation** - Send logs to external service (Datadog, CloudWatch, etc.)
2. **Log sampling** - Sample high-volume DEBUG logs in production
3. **Performance metrics** - Add timing information to all operations
4. **Log correlation** - Add request/trace IDs for distributed tracing
5. **Winston/Pino integration** - Upgrade from console to proper logging library

## Related Documentation

- [Notification System Overview](/docs/notifications.md)
- [Sentry Documentation](https://docs.sentry.io/)
- [Structured Logging Best Practices](https://www.datadoghq.com/blog/structured-logging/)
