/**
 * Pure repertoire predicates shared by the server actions and the read queries.
 *
 * This lives outside `app/actions/repertoire.ts` on purpose: that file carries
 * `'use server'`, and Next.js requires EVERY export from a server-action module
 * to be an async function. A synchronous helper exported from there fails at
 * bundle time with "Server Actions must be async functions" — which neither
 * `tsc` nor Jest catches, because only the Next bundler enforces it.
 */

/** The columns the removability rule reads. */
export type RemovabilityInput = {
  current_status: string;
  added_by_student: boolean;
  practice_session_count: number | null;
  total_practice_minutes: number | null;
};

/**
 * Mirrors the predicate enforced by `remove_song_from_my_repertoire`.
 *
 * The RPC is the authority; this exists so the UI can avoid offering a button
 * the database would refuse. Keep the two in step — if the SQL predicate
 * changes, change this with it.
 */
export function canStudentRemove(entry: RemovabilityInput): boolean {
  return (
    entry.added_by_student &&
    entry.current_status === 'to_learn' &&
    (entry.practice_session_count ?? 0) === 0 &&
    (entry.total_practice_minutes ?? 0) === 0
  );
}
