import { getGoogleAuthUrl } from '@/lib/google';
import { createClient } from '@/lib/supabase/server';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  newOAuthState,
  oauthStateCookieOptions,
} from '@/lib/auth/google-oauth-state';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

/**
 * Starts connecting the signed-in user's Google account. Anonymous visitors
 * go to sign-in. The `state` sent to Google is also stored in a short-lived
 * cookie that /api/oauth2/callback checks before it accepts the code.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/sign-in');
  }

  const state = newOAuthState();
  const isHttps = request.nextUrl.protocol === 'https:';
  (await cookies()).set(GOOGLE_OAUTH_STATE_COOKIE, state, oauthStateCookieOptions(isHttps));

  const redirectUri = `${request.nextUrl.origin}/api/oauth2/callback`;
  return redirect(getGoogleAuthUrl({ state, redirectUri }));
}
