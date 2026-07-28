import nodemailer from 'nodemailer';

/**
 * When SMTP_HOST is set, all app email goes to that server instead of Gmail —
 * E2E runs point it at the Supabase stack's Inbucket so every message is
 * captured for review (web UI on the stack's :*324 port) and nothing reaches
 * a real inbox. Unset in production, where Gmail remains the transport.
 */
const overrideHost = process.env.SMTP_HOST;

/**
 * Check if SMTP credentials are configured
 */
export function isSmtpConfigured(): boolean {
  if (overrideHost) return true;
  return !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

const transporter = overrideHost
  ? nodemailer.createTransport({
      host: overrideHost,
      port: Number(process.env.SMTP_PORT) || 1025,
      secure: false,
    })
  : nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

export default transporter;
