import { logger } from '@/lib/logger';
/**
 * Environment variable validation.
 * Import this module early (e.g., in instrumentation.ts) to catch
 * missing configuration before runtime errors occur.
 */

const requiredServerVars = ['NEXT_PUBLIC_SENTRY_DSN'] as const;

const requiredForProduction = ['CRON_SECRET'] as const;

// Optional feature flags (not required, defaults to disabled)
// STUDENT_EMAILS_ENABLED: Set to exactly 'true' to enable e-mail delivery to
//   students (lesson reminders, assignment due/overdue, digests). Unset or any
//   other value: student e-mails are downgraded to in-app notifications and
//   logged as skipped; teachers and admins still get e-mail. Nothing sets it by
//   default — it has to be set in the Production environment on Vercel once
//   real students are invited. (.env.example is gitignored; this is the doc.)
// INFAKT_API_KEY / INFAKT_API_URL / INFAKT_WEBHOOK_SECRET: the inFakt invoicing
//   client (lib/invoicing, BIL-11). Without INFAKT_API_KEY the client is
//   "skipped" and nothing is ever issued. INFAKT_API_URL defaults to production
//   (https://api.infakt.pl/api/v3); the sandbox is https://api.sandbox-infakt.pl/api/v3.
//   INFAKT_WEBHOOK_SECRET signs the invoice_paid webhook (route not built yet).
//   Names only here; values live in Vercel.
// CALCOM_WEBHOOK_SECRET: the Cal.com webhook signing secret
//   (app/api/webhooks/calcom). Required for bookings to arrive: without it the
//   route answers 500 and processes nothing (fail closed). Set it in Production
//   and Preview on Vercel to the secret configured on the Cal.com webhook.

/**
 * Validate that required environment variables are set.
 * Logs warnings for missing optional vars; throws for missing required vars.
 */
export function validateEnv() {
  const missing: string[] = [];

  for (const key of requiredServerVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    logger.warn(`[env] Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.NODE_ENV === 'production') {
    const missingProd: string[] = [];
    for (const key of requiredForProduction) {
      if (!process.env[key]) {
        missingProd.push(key);
      }
    }
    // Any one transport will do; see lib/email/smtp-client.ts for the order.
    if (!process.env.SMTP_HOST && !process.env.RESEND_API_KEY && !process.env.GMAIL_USER) {
      missingProd.push('RESEND_API_KEY');
    }
    if (missingProd.length > 0) {
      throw new Error(
        `Missing required production environment variables: ${missingProd.join(', ')}`
      );
    }
  }
}
