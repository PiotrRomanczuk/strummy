import { logger } from '@/lib/logger';
/**
 * Environment variable validation.
 * Import this module early (e.g., in instrumentation.ts) to catch
 * missing configuration before runtime errors occur.
 */

const requiredServerVars = [
  'NEXT_PUBLIC_SENTRY_DSN',
] as const;

const requiredForProduction = [
  'CRON_SECRET',
  'GMAIL_USER',
  'GMAIL_APP_PASSWORD',
] as const;

// Optional feature flags (not required, defaults to disabled)
// STUDENT_EMAILS_ENABLED: Set to exactly 'true' to enable e-mail delivery to
//   students (lesson reminders, assignment due/overdue, digests). Unset or any
//   other value: student e-mails are downgraded to in-app notifications and
//   logged as skipped; teachers and admins still get e-mail. Nothing sets it by
//   default — it has to be set in the Production environment on Vercel once
//   real students are invited. (.env.example is gitignored; this is the doc.)
// CALCOM_PRE_LESSON_URL: Base URL of the per-level warm-up lessons, e.g.
//   https://gitarawarszawa.pl/przed-lekcja. When set, a person's first Cal.com
//   booking triggers one e-mail linking to <url>/<od-zera|podstawy|dalej> by the
//   level from the booking form. Unset: no e-mail. Independent of
//   STUDENT_EMAILS_ENABLED — the recipient is a booker without an account.

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
    logger.warn(
      `[env] Missing required environment variables: ${missing.join(', ')}`
    );
  }

  if (process.env.NODE_ENV === 'production') {
    const missingProd: string[] = [];
    for (const key of requiredForProduction) {
      if (!process.env[key]) {
        missingProd.push(key);
      }
    }
    if (missingProd.length > 0) {
      throw new Error(
        `Missing required production environment variables: ${missingProd.join(', ')}`
      );
    }
  }
}
