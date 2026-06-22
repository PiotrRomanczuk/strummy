/**
 * Structured logger — public facade. ADR 0003.
 *
 * Public API (stable per ADR 0003 — do not change without amending it):
 *   logger.{debug,info,warn,error}        — default singleton
 *   createLogger('namespace').{debug,..}  — namespaced child logger
 *
 * Backend dispatch:
 *   Node runtime → Pino (structured JSON in prod, pino-pretty in dev)
 *   Edge runtime → console-based fallback (Phase 1 behaviour)
 *
 * Cross-cutting concerns handled inside the backends:
 *   - Secret redaction for token / password / authorization / cookie / …
 *   - Sentry tying (info/warn → breadcrumb; error → captureException)
 *   - Request-scoped context (requestId, userId) via AsyncLocalStorage
 *
 * See `lib/logger/` for the backends + request-context.
 */

import { isBrowserRuntime, isEdgeRuntime } from './logger/shared';
import { makeConsoleLogger } from './logger/console-backend';
import type { BoundLogger } from './logger/shared';

// Re-export the request-context helpers so callers don't reach into the
// internal directory.
export {
  runWithRequestContext,
  getRequestContext,
  generateRequestId,
  type RequestContext,
} from './logger/request-context';

function makeLogger(prefix: string): BoundLogger {
  if (isBrowserRuntime() || isEdgeRuntime()) {
    return makeConsoleLogger(prefix);
  }
  // Dynamic require keeps pino-backend (which uses process.stdout) out of
  // Edge and browser bundles — static imports would cause an Edge Runtime warning.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const { makePinoLogger } =
    require('./logger/pino-backend') as typeof import('./logger/pino-backend');
  /* eslint-enable @typescript-eslint/no-require-imports */
  return makePinoLogger(prefix);
}

/** Default (un-prefixed) logger for quick usage */
export const logger = makeLogger('app');

/** Create a namespaced logger — keeps backward compat with old API */
export function createLogger(prefix: string): BoundLogger {
  return makeLogger(prefix);
}

// Pre-configured loggers for common modules
export const middlewareLogger = createLogger('Middleware');
export const authLogger = createLogger('Auth');
export const apiLogger = createLogger('API');
export const dbLogger = createLogger('Database');

// Internal helpers exposed for unit tests. Do not import from app code.
export { redactObject, safeStringify, REDACT_KEYS } from './logger/shared';
export const __internal = (() => {
  return { isEdgeRuntime };
})();
