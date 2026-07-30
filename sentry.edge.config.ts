// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Separates preview from production in the Sentry UI.
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  // Groups issues by deploy and lines up with uploaded source maps.
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  // 10% of transactions — see instrumentation-client.ts for the rationale.
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),

  // Sentry Logs stay off: warn/error already land in `system_logs`
  // (ADR 0003 Phase 2.5) and the full firehose is in Vercel logs.
  enableLogs: false,

  // Disable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,
});
