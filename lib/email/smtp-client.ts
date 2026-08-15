import nodemailer from 'nodemailer';

/**
 * Transport selection, in priority order:
 *
 *  1. `SMTP_HOST` — an explicit override. E2E runs point it at the Supabase
 *     stack's Inbucket so every message is captured for review and nothing
 *     reaches a real inbox. It wins over everything else precisely so a test
 *     run can never send real mail by accident.
 *  2. `RESEND_API_KEY` — production. Resend's SMTP endpoint; the username is
 *     the literal string "resend" and the password is the API key.
 *  3. Gmail — legacy fallback, kept only so a machine with the old env still
 *     works. DO NOT rely on it: it sends as a personal account whose ~500/day
 *     cap is shared with real human correspondence. On 2026-08-06 that cap was
 *     reached and production sign-up returned 500 for every new user
 *     ("550 5.4.5 Daily user sending limit exceeded") because auth email and
 *     personal email compete for one quota. That is why (2) exists.
 */
const overrideHost = process.env.SMTP_HOST;
const resendApiKey = process.env.RESEND_API_KEY;

/** Sender identity for all product email. One definition — every call site imports it. */
export const MAIL_FROM = process.env.MAIL_FROM || 'Piotr from Strummy <piotr@strummy.online>';

/**
 * Where replies go. `piotr@strummy.online` has no mailbox — the domain is
 * verified for *sending* only — so replies to it would bounce. Point them at a
 * real inbox instead. Receiving mail consumes no sending quota.
 */
export const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO || 'p.romanczuk@gmail.com';

/**
 * Check if SMTP credentials are configured
 */
export function isSmtpConfigured(): boolean {
  if (overrideHost) return true;
  if (resendApiKey) return true;
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

function createTransport() {
  if (overrideHost) {
    // Auth is optional here: Inbucket needs none, but a real relay would.
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    return nodemailer.createTransport({
      host: overrideHost,
      port: Number(process.env.SMTP_PORT) || 1025,
      secure: process.env.SMTP_SECURE === 'true',
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  }

  if (resendApiKey) {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: { user: 'resend', pass: resendApiKey },
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

const transporter = createTransport();

export default transporter;
