// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Separates preview from production in the Sentry UI.
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,

  // Groups issues by deploy and lines up with uploaded source maps.
  release: process.env.VERCEL_GIT_COMMIT_SHA,

  integrations: [
    // Add the Vercel AI SDK integration to sentry.server.config.ts
    // recordInputs/recordOutputs are off: prompts and completions can carry
    // student names and lesson notes, and sendDefaultPii is false for the
    // same reason. Turn on locally when debugging an AI regression.
    Sentry.vercelAIIntegration({
      recordInputs: false,
      recordOutputs: false,
    }),
  ],

  // 10% of transactions — see sentry.client.config.ts for the rationale.
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),

  // Sentry Logs stay off: warn/error already land in `system_logs`
  // (ADR 0003 Phase 2.5) and the full firehose is in Vercel logs.
  enableLogs: false,

  // Disable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,
});
