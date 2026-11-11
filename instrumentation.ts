import * as Sentry from "@sentry/nextjs";
import { validateEnv } from "./lib/env";

export const STUDIO_TIME_ZONE = "Europe/Warsaw";

export async function register() {
  // Vercel runs functions in UTC, and the app renders times on the server: a
  // 17:30 lesson showed as 15:30, "today" ended at the wrong hour, and reminder
  // mails carried the UTC clock. Setting this before the first request fixes
  // every Date on the server at once. Stored timestamps stay in UTC.
  process.env.TZ = STUDIO_TIME_ZONE;

  validateEnv();

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
