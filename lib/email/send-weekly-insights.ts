import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { getWeeklyInsightsData, getLastWeekDateRange } from '@/lib/services/weekly-insights';
import { generateWeeklyInsightsHtml } from '@/lib/email/templates/weekly-insights';
import transporter, { MAIL_FROM, MAIL_REPLY_TO } from '@/lib/email/smtp-client';
import { logger } from '@/lib/logger';

interface SendWeeklyInsightsResult {
  success: boolean;
  emailsSent: number;
  errors?: string[];
}

/**
 * Send weekly insight emails to all teachers and admins
 * Called by cron job every Monday at 9 AM UTC.
 *
 * Not a Server Action: the only callers are the cron routes
 * (`/api/cron/weekly-insights`, the dispatcher), which verify CRON_SECRET first.
 */
export async function sendWeeklyInsights(): Promise<SendWeeklyInsightsResult> {
  const errors: string[] = [];
  let emailsSent = 0;

  try {
    // Cron runs without a user session: the cookie-session client saw nothing
    // under RLS, so this job sent no email at all. The admin client reads every
    // teacher; getWeeklyInsightsData scopes each teacher's data by their id.
    const supabase = createAdminClient();

    // Active teachers and admins (boolean role flags, not a `role` column),
    // without the demo cohort (`is_development`).
    const { data: teachers, error: teachersError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .or('is_teacher.eq.true,is_admin.eq.true')
      .eq('is_active', true)
      .eq('is_development', false);

    if (teachersError) {
      logger.error('[sendWeeklyInsights] Failed to fetch teachers:', teachersError);
      return { success: false, emailsSent: 0, errors: [teachersError.message] };
    }

    if (!teachers || teachers.length === 0) {
      return { success: true, emailsSent: 0 };
    }

    // Get last week's date range (Monday to Sunday)
    const { start, end } = getLastWeekDateRange();

    // Send email to each teacher
    for (const teacher of teachers) {
      if (!teacher.email) continue;
      try {
        // Get weekly insights data for this teacher
        const insightsData = await getWeeklyInsightsData(supabase, teacher.id, start, end);

        // Generate HTML email
        const html = generateWeeklyInsightsHtml(insightsData);

        // Send email
        await transporter.sendMail({
          from: MAIL_FROM,
          replyTo: MAIL_REPLY_TO,
          to: teacher.email,
          subject: `📊 Your Weekly Insights - ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          html: html,
        });

        emailsSent++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(
          `[sendWeeklyInsights] Failed to send email to ${teacher.email}:`,
          errorMessage
        );
        errors.push(`${teacher.email}: ${errorMessage}`);
      }
    }

    return {
      success: errors.length === 0,
      emailsSent,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    logger.error('[sendWeeklyInsights] Fatal error:', error);
    return {
      success: false,
      emailsSent,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
