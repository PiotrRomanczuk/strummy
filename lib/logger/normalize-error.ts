/**
 * Normalizes the second argument of `logger.error(message, error, context)`.
 *
 * The declared contract is "an error", but ~90 call sites across 38 files
 * pass a *context wrapper* instead:
 *
 *   log.error('Failed to insert lesson', { error });
 *   log.error('Error fetching repertoire', { studentId, error });
 *   log.error('[SupabaseConfig] Missing config', { localUrl, remoteUrl });
 *
 * That shape used to be destructive. `serializeError` reads `.message` /
 * `.stack` off whatever it is handed, and a wrapper object has neither, so
 * the row persisted into `system_logs` — the one surface built for reading
 * these — came out as:
 *
 *   { type: 'Error', message: '[object Object]', stack: null }, context: null
 *
 * Fixing 90 call sites would fix 90 call sites. Normalizing here fixes them
 * all at once and makes the wrapper form permanently safe, which matters
 * more: the wrapper reads naturally, every one of those authors reached for
 * it, and nothing in the type signature pushes back (the parameter is
 * `unknown`, as it must be to accept a `catch` binding).
 *
 * So: accept both shapes, lose nothing either way.
 */

import type { LogContext } from './shared';

/** Keys a wrapper object might use to carry the actual error. */
const ERROR_KEYS = ['error', 'err', 'cause', 'exception'] as const;

export interface NormalizedError {
  /** The value to serialize as the error / hand to Sentry. */
  error: unknown;
  /** Wrapper fields that were context all along, merged into the log context. */
  extraContext?: LogContext;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Does this object describe an error in its own right? Covers real `Error`s
 * and the many error-shaped objects that are not `instanceof Error` —
 * Supabase's `PostgrestError`, fetch failures, structured-clone survivors.
 */
export function isErrorLike(value: unknown): boolean {
  if (value instanceof Error) return true;
  if (!isPlainObject(value)) return false;
  return typeof value.message === 'string' || typeof value.stack === 'string';
}

/**
 * Split the `error` argument into the error itself plus any context that was
 * bundled alongside it.
 *
 * - real Error / error-like object  → passed through untouched
 * - `{ error, ...rest }` wrapper    → unwrapped, `rest` becomes context
 * - `{ ...onlyContext }`            → no error; the whole object is context
 * - primitives, null, undefined     → passed through untouched
 */
export function normalizeErrorArg(arg: unknown): NormalizedError {
  if (arg === null || arg === undefined) return { error: arg };
  if (isErrorLike(arg)) return { error: arg };
  if (!isPlainObject(arg)) return { error: arg };

  // A plain object that isn't itself error-like: treat it as a wrapper and
  // look for the error inside it.
  const key = ERROR_KEYS.find((k) => k in arg && arg[k] !== undefined);

  if (!key) {
    // No error in there at all — it was pure context (e.g. `{ localUrl }`).
    return { error: undefined, extraContext: arg };
  }

  const { [key]: inner, ...rest } = arg;
  return {
    error: inner,
    extraContext: Object.keys(rest).length > 0 ? rest : undefined,
  };
}
