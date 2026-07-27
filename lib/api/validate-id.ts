import { NextResponse } from 'next/server';

import { UUIDPattern } from '@/schemas/CommonSchema';

type ParsedId = { ok: true; id: string } | { ok: false; response: NextResponse };

/**
 * Guard for route params that are database ids.
 *
 * Every id in this app is a Postgres `uuid`. Passing a malformed one straight
 * into a query makes Postgres raise `22P02 invalid input syntax for type uuid`,
 * which callers used to see as a 500 carrying the raw driver message — the
 * wrong class (a bad id is the caller's error, not ours) and a needless leak of
 * schema internals.
 *
 * Returns a discriminated result so the happy path also narrows
 * `string | null` to `string`. Use as a guard clause:
 *
 *   const parsed = parseId(songId, 'Song');
 *   if (!parsed.ok) return parsed.response;
 *   // parsed.id is a validated uuid
 */
export function parseId(id: string | null | undefined, resource: string): ParsedId {
  if (!id) {
    return {
      ok: false,
      response: NextResponse.json({ error: `${resource} ID is required` }, { status: 400 }),
    };
  }

  if (!UUIDPattern.safeParse(id).success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Invalid ${resource.toLowerCase()} ID` },
        { status: 400 }
      ),
    };
  }

  return { ok: true, id };
}
