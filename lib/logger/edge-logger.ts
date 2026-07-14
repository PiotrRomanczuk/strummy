/**
 * Edge-safe logger for Next.js middleware (proxy.ts) and any Edge Runtime route.
 * Wraps console-backend directly — no pino import, no process.stdout.
 */

import { makeConsoleLogger } from './console-backend';
import type { BoundLogger } from './shared';

export function createEdgeLogger(prefix: string): BoundLogger {
  return makeConsoleLogger(prefix);
}

export const middlewareLogger = createEdgeLogger('Middleware');
