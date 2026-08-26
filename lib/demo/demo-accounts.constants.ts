/**
 * The demo identities the public "Try the demo" path signs into, and that
 * `npm run seed:demo` provisions.
 *
 * Single source of truth on purpose: the teacher address used to be typed out
 * in the sign-in page, the Playwright auth fixture, two demo E2E specs, the
 * verify fixtures and the README — so renaming the demo teacher meant finding
 * six copies, and missing one left a dead login behind a public button.
 *
 * These credentials are public by design: the sign-in page fills them into a
 * visible form, and they unlock nothing beyond seeded demo data (every demo
 * profile carries `is_development`, which `guardTestAccountMutation` gates).
 */

// pragma: allowlist secret
export const DEMO_PASSWORD = 'Demo2024!';

/**
 * Signed in by the landing page's "Try the demo" button.
 *
 * DO NOT rename this without renaming the production account in the SAME
 * change, and do not rename either one ahead of a deploy. This constant is
 * compiled into the build, so for the whole window between "renamed the
 * account" and "shipped the new build", the live button signs into an address
 * that no longer exists — which is exactly what happened on 2026-08-26 and
 * left the public demo answering "Invalid email or password".
 *
 * The display name is Polish (Anna Kowalska); the address deliberately is not,
 * because changing it buys nothing a visitor can see and costs a broken button.
 */
export const DEMO_TEACHER_EMAIL = 'sarah@strummy.app';

/** The student counterpart, used by E2E and the student-side demo walkthrough. */
export const DEMO_STUDENT_EMAIL = 'zosia@strummy.app';
