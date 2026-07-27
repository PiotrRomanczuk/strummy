import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

/**
 * Sign out via a plain navigation.
 *
 * The session is an `sb-<ref>-auth-token` **cookie** written by the SSR client —
 * `supabase.auth.signOut()` in the browser clears localStorage and leaves the
 * cookie untouched, so middleware kept seeing a valid session and bounced the
 * user straight back to the dashboard. On a shared machine that means "Sign out"
 * did not sign anyone out.
 *
 * This is a route handler rather than a client call on purpose: a navigation
 * cannot silently no-op the way a floating promise can (the previous client
 * implementation failed with no redirect, no error and no log), the response
 * carries the cleared cookie, and it still works with JS disabled or broken.
 */
export async function GET(request: Request) {
  const redirectTo = new URL('/sign-in', request.url);

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error)
      logger.warn('[auth/signout] signOut failed; redirecting anyway', { error: error.message });
  } catch (error) {
    logger.error('[auth/signout] signOut threw; redirecting anyway', error);
  }

  // 303 so the browser issues a GET for /sign-in regardless of how it got here.
  return NextResponse.redirect(redirectTo, { status: 303 });
}
