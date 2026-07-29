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

config({ path: path.resolve(process.cwd(), '.env.local'), quiet: true });
