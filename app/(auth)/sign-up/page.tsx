import { redirect } from 'next/navigation';

/**
 * Self-service registration is closed.
 *
 * Accounts are created by invitation: a teacher invites their students, and
 * teachers themselves arrive through the interest form. The landing page sells
 * two things — the demo and that form — so a stranger has no account to create.
 *
 * This route redirects rather than 404s because the address is out in the
 * world: old links, bookmarks, and anything already indexed. Sending them to
 * the form keeps a would-be teacher moving instead of dead-ending them.
 *
 * The guard that matters is in `signUp()` (app/auth/actions.ts) — a server
 * action is callable without ever loading this page.
 */
export default function SignUpPage() {
  redirect('/for-teachers');
}
