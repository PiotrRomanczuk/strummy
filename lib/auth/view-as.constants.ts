/**
 * Admin "view as student" (2026-10-21): an admin previews the dashboard exactly
 * as one student sees it. The cookie holds the student's profile id and is
 * honoured only when the real signed-in user is an admin (lib/auth/view-as.ts).
 * It is readable by the browser on purpose: the browser Supabase client checks
 * it to refuse writes. Holding it grants nothing; only blocks writes.
 */
export const VIEW_AS_COOKIE = 'strummy-view-as';

/** One hour: a preview, not a second identity. */
export const VIEW_AS_MAX_AGE_SECONDS = 60 * 60;

export const VIEW_AS_READ_ONLY_ERROR =
  'Read-only preview: changes are disabled while viewing as a student';
