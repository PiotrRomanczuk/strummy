import type { InfaktError, InfaktErrorKind } from './infakt-types';

const NO_BANK_ACCOUNT_MESSAGE =
  'No bank account configured in inFakt: add one in the inFakt account settings before issuing transfer invoices.';

const BANK_FIELDS = ['bank_account', 'bank_name'];

function makeError(
  kind: InfaktErrorKind,
  status: number | null,
  message: string,
  fieldErrors: Record<string, string[]> = {},
  isRetryable = false
): InfaktError {
  return { kind, status, message, fieldErrors, isRetryable };
}

export function networkError(): InfaktError {
  return makeError('network', null, 'Could not reach inFakt.', {}, true);
}

export function invalidResponseError(status: number): InfaktError {
  return makeError(
    'invalid_response',
    status,
    'inFakt returned a response that could not be read.'
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** `{field: ["msg"]}` and `{invalid_resource: "msg"}` both become field -> messages. */
function readFieldErrors(body: Record<string, unknown> | null): Record<string, string[]> {
  const errors = asRecord(body?.errors);
  if (!errors) return {};
  const result: Record<string, string[]> = {};
  for (const [field, value] of Object.entries(errors)) {
    const messages = (Array.isArray(value) ? value : [value]).filter(
      (item): item is string => typeof item === 'string'
    );
    if (messages.length > 0) result[field] = messages;
  }
  return result;
}

function pickMessage(
  body: Record<string, unknown> | null,
  fields: Record<string, string[]>
): string | null {
  if (typeof body?.error === 'string') return body.error;
  const first = Object.entries(fields)[0];
  return first ? `${first[0]}: ${first[1].join(', ')}` : null;
}

/** Turns a non-2xx response into a typed error. `body` is the parsed JSON, or null. */
export function mapErrorResponse(status: number, body: unknown): InfaktError {
  const record = asRecord(body);
  const fields = readFieldErrors(record);
  const message = pickMessage(record, fields);

  if (status === 401)
    return makeError('unauthorized', status, message ?? 'inFakt API key was refused.');
  if (status === 404) return makeError('not_found', status, message ?? 'Not found in inFakt.');
  if (status === 422) {
    if (BANK_FIELDS.some((field) => field in fields)) {
      return makeError('no_bank_account', status, NO_BANK_ACCOUNT_MESSAGE, fields);
    }
    return makeError('validation', status, message ?? 'inFakt refused the document.', fields);
  }
  const isRetryable = status === 429 || status >= 500;
  return makeError(
    'http',
    status,
    message ?? `inFakt answered with status ${status}.`,
    fields,
    isRetryable
  );
}
