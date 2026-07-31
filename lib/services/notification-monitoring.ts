/**
 * Notification Monitoring Service
 *
 * Functions to monitor notification system health and send admin alerts for:
 * - High failure rates
 * - High bounce rates
 * - Large queue backlogs
 * - Daily summary reports
 */

'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import transporter from '@/lib/email/smtp-client';
import {
  generateBaseEmailHtml,
  createSectionHeading,
  createParagraph,
  createCardSection,
  createSubsectionHeading,
} from '@/lib/email/templates/base-template';
import { logger } from '@/lib/logger';

// ============================================================================
// ADMIN EMAIL HELPERS
// ============================================================================

/**
 * Get all admin emails from profiles
 */
async function getAdminEmails(): Promise<string[]> {
  const supabase = createAdminClient();

  const { data: admins, error } = await supabase
    .from('profiles')
    .select('email')
    .eq('is_admin', true);

  if (error || !admins) {
    logger.error('Failed to fetch admin emails:', error);
    return [];
  }

  // profiles.email is nullable; an admin without an address cannot be mailed.
  return admins.map((a) => a.email).filter((e): e is string => !!e);
}

/**
 * Send email to all admins
 */
async function sendAdminEmail(subject: string, htmlContent: string): Promise<void> {
  const adminEmails = await getAdminEmails();

  if (adminEmails.length === 0) {
    logger.warn('No admin emails found for alert');
    return;
  }

  try {
    await transporter.sendMail({
      from: `"Strummy System" <${process.env.GMAIL_USER}>`,
      to: adminEmails.join(','),
      subject,
      html: htmlContent,
    });

    // Email sent successfully
  } catch (error) {
    logger.error('Failed to send admin email:', error);
    throw error;
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface BounceRateCheck {
  templateType: string;
  bounceCount: number;
  totalSent: number;
  bounceRate: number;
}

interface BounceStatRow {
  notification_type: string;
  bounce_count: number;
  total_sent: number;
}

// ============================================================================
// MONITORING CHECKS
// ============================================================================

/**
 * Check failure rate for the last hour
 * Alert if > 10%
 */
export async function checkFailureRate(): Promise<void> {
  const supabase = createAdminClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  // Get total sent in last hour
  const { data: logs, error } = await supabase
    .from('notification_log')
    .select('status, notification_type, error_message')
    .gte('created_at', oneHourAgo);

  if (error || !logs) {
    logger.error('Failed to check failure rate:', error);
    return;
  }

  const totalSent = logs.length;
  const failed = logs.filter((log) => log.status === 'failed').length;
  const failureRate = totalSent > 0 ? (failed / totalSent) * 100 : 0;

  // Alert if failure rate > 10%
  if (failureRate > 10) {
    // Aggregate error messages
    const errorMap = new Map<string, number>();
    logs
      .filter((log) => log.status === 'failed' && log.error_message)
      .forEach((log) => {
        const errorKey = log.error_message || 'Unknown error';
        errorMap.set(errorKey, (errorMap.get(errorKey) || 0) + 1);
      });

    const sampleErrors = Array.from(errorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([message, count]) => ({
        type: 'Email Delivery Error',
        message,
        count,
      }));

    const bodyContent = `
      ${createSectionHeading('High Failure Rate Alert')}
      ${createParagraph(
        'The notification system has detected a high failure rate in the last hour.'
      )}

      ${createCardSection(`
        <div style="display: table; width: 100%; margin-bottom: 16px;">
          <div style="display: table-row;">
            <div style="display: table-cell; padding-right: 20px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">
                Total Sent
              </p>
              <p style="margin: 0; color: #18181b; font-size: 24px; font-weight: 700;">
                ${totalSent}
              </p>
            </div>
            <div style="display: table-cell; padding-right: 20px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">
                Failed
              </p>
              <p style="margin: 0; color: #dc2626; font-size: 24px; font-weight: 700;">
                ${failed}
              </p>
            </div>
            <div style="display: table-cell;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">
                Failure Rate
              </p>
              <p style="margin: 0; color: #dc2626; font-size: 24px; font-weight: 700;">
                ${failureRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      `)}

      ${
        sampleErrors.length > 0
          ? `
      ${createCardSection(`
        ${createSubsectionHeading('Sample Errors')}
        <table style="width: 100%; border-collapse: collapse;">
          ${sampleErrors
            .map(
              (error, index) => `
            <tr style="${index !== sampleErrors.length - 1 ? 'border-bottom: 1px solid #e4e4e7;' : ''}">
              <td style="padding: 12px 0;">
                <div style="color: #18181b; font-weight: 500; font-size: 14px; margin-bottom: 4px;">
                  ${error.message}
                </div>
                <div style="color: #71717a; font-size: 13px;">
                  ${error.count} occurrence${error.count > 1 ? 's' : ''}
                </div>
              </td>
            </tr>
          `
            )
            .join('')}
        </table>
      `)}
      `
          : ''
      }

      ${createParagraph(
        'Please investigate the notification system and check for any configuration issues or service outages.'
      )}
    `;

    const htmlContent = generateBaseEmailHtml({
      subject: `Alert: High Notification Failure Rate (${failureRate.toFixed(1)}%)`,
      preheader: `${failed} of ${totalSent} notifications failed in the last hour`,
      bodyContent,
    });

    await sendAdminEmail(
      `Alert: High Notification Failure Rate (${failureRate.toFixed(1)}%)`,
      htmlContent
    );
  }
}

/**
 * Check bounce rate by template type
 * Alert if > 5% for any template
 */
export async function checkBounceRate(): Promise<void> {
  const supabase = createAdminClient();

  // Get bounce stats by notification type
  const { data: stats, error } = (await supabase.rpc('get_bounce_stats' as never)) as unknown as {
    data: BounceStatRow[] | null;
    error: { message: string } | null;
  };

  if (error) {
    logger.error('Failed to check bounce rate:', error);
    return;
  }

  if (!stats || stats.length === 0) {
    return;
  }

  // Check each notification type
  const alerts: BounceRateCheck[] = [];

  for (const stat of stats) {
    const bounceRate = stat.total_sent > 0 ? (stat.bounce_count / stat.total_sent) * 100 : 0;

    if (bounceRate > 5) {
      alerts.push({
        templateType: stat.notification_type,
        bounceCount: stat.bounce_count,
        totalSent: stat.total_sent,
        bounceRate,
      });
    }
  }

  if (alerts.length > 0) {
    const bodyContent = `
      ${createSectionHeading('High Bounce Rate Alert')}
      ${createParagraph('The following notification types have a bounce rate exceeding 5%:')}

      ${createCardSection(`
        <table style="width: 100%; border-collapse: collapse;">
          ${alerts
            .map(
              (alert, index) => `
            <tr style="${index !== alerts.length - 1 ? 'border-bottom: 1px solid #e4e4e7;' : ''}">
              <td style="padding: 16px 0;">
                <div style="color: #18181b; font-weight: 600; font-size: 15px; margin-bottom: 4px;">
                  ${alert.templateType.replace(/_/g, ' ').toUpperCase()}
                </div>
                <div style="color: #71717a; font-size: 14px;">
                  ${alert.bounceCount} bounces out of ${alert.totalSent} sent
                  <span style="color: #dc2626; font-weight: 600; margin-left: 8px;">
                    (${alert.bounceRate.toFixed(1)}%)
                  </span>
                </div>
              </td>
            </tr>
          `
            )
            .join('')}
        </table>
      `)}

      ${createParagraph(
        'High bounce rates may indicate invalid email addresses. Consider cleaning the user email list or implementing email verification.'
      )}
    `;

    const htmlContent = generateBaseEmailHtml({
      subject: 'Alert: High Email Bounce Rate Detected',
      preheader: `${alerts.length} notification type${alerts.length > 1 ? 's' : ''} with high bounce rates`,
      bodyContent,
    });

    await sendAdminEmail('Alert: High Email Bounce Rate Detected', htmlContent);
  }
}

/**
 * Check queue backlog
 * Alert if > 500 pending notifications
 */
export async function checkQueueBacklog(): Promise<void> {
  const supabase = createAdminClient();

  // Get pending notification count and oldest notification
  const { data: stats, error } = await supabase
    .from('notification_queue')
    .select('created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Failed to check queue backlog:', error);
    return;
  }

  const pendingCount = stats?.length || 0;

  if (pendingCount > 500) {
    const oldestNotification = stats?.[0]?.created_at || null;
    const oldestAge = oldestNotification ? calculateAge(oldestNotification) : 'Unknown';

    const bodyContent = `
      ${createSectionHeading('Queue Backlog Alert')}
      ${createParagraph('The notification queue has a large backlog of pending notifications.')}

      ${createCardSection(`
        <div style="display: table; width: 100%; margin-bottom: 16px;">
          <div style="display: table-row;">
            <div style="display: table-cell; padding-right: 20px;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">
                Pending
              </p>
              <p style="margin: 0; color: #f59e0b; font-size: 24px; font-weight: 700;">
                ${pendingCount}
              </p>
            </div>
            <div style="display: table-cell;">
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">
                Oldest Notification
              </p>
              <p style="margin: 0; color: #18181b; font-size: 16px; font-weight: 600;">
                ${oldestAge}
              </p>
            </div>
          </div>
        </div>
      `)}

      ${createParagraph(
        'This may indicate that the queue processing cron job is not running frequently enough or there is a bottleneck in email delivery.'
      )}
    `;

    const htmlContent = generateBaseEmailHtml({
      subject: `Alert: Large Notification Queue Backlog (${pendingCount} pending)`,
      preheader: `${pendingCount} notifications waiting to be sent`,
      bodyContent,
    });

    await sendAdminEmail(
      `Alert: Large Notification Queue Backlog (${pendingCount} pending)`,
      htmlContent
    );
  }
}

/**
 * Send daily admin summary
 * Runs once per day with notification stats
 */
export async function sendDailyAdminSummary(): Promise<void> {
  const supabase = createAdminClient();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Get stats for last 24 hours
  const { data: logs, error } = await supabase
    .from('notification_log')
    .select('status, notification_type')
    .gte('created_at', yesterday);

  if (error || !logs) {
    logger.error('Failed to fetch daily summary data:', error);
    return;
  }

  const totalSent = logs.length;
  const successCount = logs.filter((log) => log.status === 'sent').length;
  const successRate = totalSent > 0 ? (successCount / totalSent) * 100 : 0;

  // Top 5 notification types by volume
  const typeMap = new Map<string, number>();
  logs.forEach((log) => {
    typeMap.set(log.notification_type, (typeMap.get(log.notification_type) || 0) + 1);
  });

  const topNotificationTypes = Array.from(typeMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  // Get queue status
  const { data: queueStats } = await supabase
    .from('notification_queue')
    .select('created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const pendingCount = queueStats?.length || 0;
  const oldestNotification = queueStats?.[0]?.created_at || null;

  const bodyContent = `
    ${createSectionHeading('Daily Notification Summary')}
    ${createParagraph(`Here's your daily summary for ${new Date().toLocaleDateString()}.`)}

    <!-- Quick Stats -->
    <div style="display: table; width: 100%; margin-bottom: 24px;">
      <div style="display: table-row;">
        <div style="display: table-cell; padding: 16px; background-color: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd; text-align: center; width: 50%;">
          <p style="margin: 0 0 4px 0; font-size: 28px; font-weight: 700; color: #0369a1;">
            ${totalSent}
          </p>
          <p style="margin: 0; font-size: 13px; color: #0c4a6e; font-weight: 500;">
            Total Sent (24h)
          </p>
        </div>
        <div style="display: table-cell; padding: 0 12px;"></div>
        <div style="display: table-cell; padding: 16px; background-color: ${successRate >= 90 ? '#f0fdf4' : '#fef3c7'}; border-radius: 8px; border: 1px solid ${successRate >= 90 ? '#bbf7d0' : '#fde68a'}; text-align: center; width: 50%;">
          <p style="margin: 0 0 4px 0; font-size: 28px; font-weight: 700; color: ${successRate >= 90 ? '#15803d' : '#b45309'};">
            ${successRate.toFixed(1)}%
          </p>
          <p style="margin: 0; font-size: 13px; color: ${successRate >= 90 ? '#166534' : '#78350f'}; font-weight: 500;">
            Success Rate
          </p>
        </div>
      </div>
    </div>

    ${
      topNotificationTypes.length > 0
        ? `
    ${createCardSection(`
      ${createSubsectionHeading('Top 5 Notification Types')}
      <table style="width: 100%; border-collapse: collapse;">
        ${topNotificationTypes
          .map(
            (item, index) => `
          <tr style="${index !== topNotificationTypes.length - 1 ? 'border-bottom: 1px solid #e4e4e7;' : ''}">
            <td style="padding: 12px 0;">
              <div style="color: #18181b; font-weight: 500; font-size: 15px;">
                ${item.type.replace(/_/g, ' ').toUpperCase()}
              </div>
            </td>
            <td style="text-align: right; padding: 12px 0;">
              <div style="color: #71717a; font-size: 15px; font-weight: 600;">
                ${item.count}
              </div>
            </td>
          </tr>
        `
          )
          .join('')}
      </table>
    `)}
    `
        : ''
    }

    ${createCardSection(`
      ${createSubsectionHeading('Queue Status')}
      <div style="color: #52525b; font-size: 15px; line-height: 1.6;">
        <p style="margin: 0 0 8px 0;">
          <strong>Pending notifications:</strong> ${pendingCount}
        </p>
        ${
          oldestNotification
            ? `
        <p style="margin: 0;">
          <strong>Oldest notification:</strong> ${calculateAge(oldestNotification)}
        </p>
        `
            : ''
        }
      </div>
    `)}

    ${createParagraph('System is operating normally.')}
  `;

  const htmlContent = generateBaseEmailHtml({
    subject: `Daily Notification Summary - ${new Date().toLocaleDateString()}`,
    preheader: `${totalSent} notifications sent, ${successRate.toFixed(1)}% success rate`,
    bodyContent,
  });

  await sendAdminEmail(
    `Daily Notification Summary - ${new Date().toLocaleDateString()}`,
    htmlContent
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate human-readable age from ISO timestamp
 */
function calculateAge(timestamp: string): string {
  const now = new Date();
  const created = new Date(timestamp);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  }

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}
