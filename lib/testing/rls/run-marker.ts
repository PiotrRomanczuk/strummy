/**
 * Marks every row an RLS run creates, so the run can delete exactly its own
 * rows — and nothing a concurrent run (another PR's CI, the nightly) still uses.
 *
 * Why it exists: until 2026-10-21 the suites cleaned up by deleting auth users
 * and trusting FK cascades. Songs have no owner, so every run leaked its
 * fixture songs, and failed `deleteUser` calls were swallowed by
 * `Promise.allSettled`. The dev stack had collected 5 562 test accounts and
 * 3 080 fixture songs.
 *
 * `jest.global-setup.ts` sets RLS_RUN_ID once per run; the fallback covers a
 * suite started without that setup (e.g. a stray `npx jest <file>`).
 */
export const RLS_EMAIL_DOMAIN = 'guitarcrm.local';

export function rlsRunId(): string {
  process.env.RLS_RUN_ID ??= `adhoc-${Date.now().toString(36)}`;
  return process.env.RLS_RUN_ID;
}

/** `user_metadata` for every auth user an RLS suite creates. */
export function rlsUserMetadata(): { isTest: true; rlsRunId: string } {
  return { isTest: true, rlsRunId: rlsRunId() };
}

/** Fixture song titles carry the run id: `RLS <label> song <run>`. */
export function rlsSongTitle(label: string): string {
  return `RLS ${label} song ${rlsRunId()}`;
}
