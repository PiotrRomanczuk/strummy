/**
 * Loads `.env.local` for the RLS suites — explicitly, because nothing else will.
 *
 * `next/jest` runs Next's `loadEnvConfig`, which deliberately skips
 * `.env.local` when `NODE_ENV=test` so that unit tests give everyone the same
 * result regardless of local configuration. That is the right default for the
 * mocked suites — and it silently defeated these ones: `readRlsEnv()` found no
 * service-role key, `describeIfRls` degraded every suite to `describe.skip`,
 * and 99 real-database tests reported green while executing nothing.
 *
 * The RLS suites are the exception the rule was not written for: local
 * credentials are precisely what they need. Safety does not depend on the
 * absence of env — it comes from `readRlsEnv`'s BLOCKED_URL_MARKERS, which
 * throws on any production-shaped URL.
 *
 * `dotenv` does not overwrite variables that are already set, so an explicit
 * `RLS_TEST_*` from CI still wins over whatever `.env.local` happens to hold.
 */
import path from 'node:path';
import { config } from 'dotenv';

import { readRlsEnv } from './env';

config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });

/**
 * App code under test sends mail (a completed assignment notifies the
 * teacher). It must never reach a real relay: the real credentials are
 * dropped and SMTP_HOST points at the Mailpit the Supabase CLI runs beside the
 * test stack's API (API port + 4: dev 55321 → 55325). Without a usable stack
 * SMTP is left unconfigured, so the app logs "SMTP not configured" instead.
 */
function routeMailToMailpit(): void {
  for (const key of [
    'RESEND_API_KEY',
    'GMAIL_USER',
    'GMAIL_APP_PASSWORD',
    'SMTP_USER',
    'SMTP_PASS',
  ]) {
    delete process.env[key];
  }
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  let stackUrl: URL;
  try {
    const env = readRlsEnv();
    if (!env) return;
    stackUrl = new URL(env.supabaseUrl);
  } catch {
    return; // a production-shaped URL: readRlsEnv throws again where it matters
  }
  process.env.SMTP_HOST = stackUrl.hostname;
  process.env.SMTP_PORT = String(Number(stackUrl.port || 80) + 4);
}

routeMailToMailpit();
