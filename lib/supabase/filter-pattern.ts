/**
 * User-typed text inside a PostgREST `or()` filter.
 *
 * `.or('title.ilike.%x%,author.ilike.%x%')` is parsed by PostgREST as a small
 * expression: `,` starts another condition, `(` `)` group them, and `"` `\`
 * quote and escape. Interpolating raw input there lets a search like
 * `x%,id.gt.0` add a condition of its own. `%`, `_` and `*` (PostgREST's alias
 * for `%`) are LIKE wildcards. Removing all of them keeps the search a plain
 * "contains" match.
 *
 * For an exact value (an e-mail), use separate `.eq()` calls instead — they
 * send the value as a parameter, never as filter syntax.
 */
const FILTER_SYNTAX = /[\\%_*,()"]/g;

/** Longest search term kept; anything longer is not a search, it is noise. */
const MAX_SEARCH_LENGTH = 100;

/**
 * The search term with filter syntax and LIKE wildcards removed, trimmed and
 * capped. Empty when nothing searchable is left — callers skip the filter then.
 */
export function cleanSearchTerm(input: string): string {
  return input.replace(FILTER_SYNTAX, '').trim().slice(0, MAX_SEARCH_LENGTH);
}

/** `%term%` for an `ilike` inside `.or()`, built from {@link cleanSearchTerm}. */
export function containsPattern(input: string): string {
  return `%${cleanSearchTerm(input)}%`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `student_id = id OR teacher_id = id` for a lesson query, or null when `id`
 * is not a UUID. The id usually comes from a query string; a valid UUID cannot
 * carry filter syntax, anything else is refused by the caller.
 */
export function participantFilter(id: string): string | null {
  return UUID.test(id) ? `student_id.eq.${id},teacher_id.eq.${id}` : null;
}
