import { VIEW_AS_READ_ONLY_ERROR } from '@/lib/auth/view-as.constants';

/**
 * Write block for "view as student". While the view-as cookie is present every
 * Supabase client refuses database and storage writes, whichever action, route
 * or component issues them, so a preview can never change the student's data
 * (admin RLS would otherwise allow it). Auth calls (token refresh) still pass.
 * Read RPCs are POSTs too and are refused as well: the student pages use none.
 */
const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const DATA_PATH = /\/(rest|storage)\/v1\//;

type FetchInput = Parameters<typeof fetch>[0];

function urlOf(input: FetchInput): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function methodOf(input: FetchInput, init?: RequestInit): string {
  const method =
    init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET');
  return method.toUpperCase();
}

export function isDataWrite(input: FetchInput, init?: RequestInit): boolean {
  return WRITE_METHODS.has(methodOf(input, init)) && DATA_PATH.test(urlOf(input));
}

export function readOnlyResponse(): Response {
  return new Response(
    JSON.stringify({ message: VIEW_AS_READ_ONLY_ERROR, code: 'VIEW_AS_READ_ONLY' }),
    {
      status: 403,
      headers: { 'content-type': 'application/json' },
    }
  );
}

/** Wraps fetch so data writes are refused whenever `isViewingAs()` says so. */
export function viewAsGuardedFetch(isViewingAs: () => boolean | Promise<boolean>): typeof fetch {
  return async (input, init) => {
    if (isDataWrite(input, init) && (await isViewingAs())) return readOnlyResponse();
    return fetch(input, init);
  };
}
