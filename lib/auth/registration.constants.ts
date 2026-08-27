/**
 * Why this is not in `app/auth/actions.ts`: that file is `'use server'`, and a
 * server-actions module may only export async functions. Exporting a plain
 * string from it breaks the whole module, and the error Next.js reports is
 * misleading — it names some *other* export as missing, which sends you
 * looking in the wrong place entirely.
 */

/** Shown to anyone who reaches the closed self-service sign-up path. */
export const SIGNUP_CLOSED_ERROR =
  'Strummy is invite-only during the beta. Leave your details at /for-teachers and I will set you up.';
