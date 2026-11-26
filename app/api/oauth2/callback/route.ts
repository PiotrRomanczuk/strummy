import { getGoogleOAuth2Client } from '@/lib/google';
import { createClient } from '@/lib/supabase/server';
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  isOAuthStateValid,
  oauthStateCookieOptions,
} from '@/lib/auth/google-oauth-state';
import { cookies } from 'next/headers';
import { redirect, unstable_rethrow } from 'next/navigation';
import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

/** Reads the `state` cookie set by /api/auth/google and expires it: one use. */
async function takeExpectedState(request: NextRequest): Promise<string | undefined> {
  const cookieStore = await cookies();
  const expected = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const isHttps = request.nextUrl.protocol === 'https:';
  cookieStore.set(GOOGLE_OAUTH_STATE_COOKIE, '', oauthStateCookieOptions(isHttps, 0));
  return expected;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const expectedState = await takeExpectedState(request);

  if (error) {
    return redirect('/dashboard?error=google_auth_error');
  }

  if (!code) {
    return redirect('/dashboard?error=no_code');
  }

  // Only a code from a flow this browser started via /api/auth/google.
  if (!isOAuthStateValid(searchParams.get('state'), expectedState)) {
    return redirect('/dashboard?error=google_auth_state');
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return redirect('/login?error=unauthorized');
    }

    const redirectUri = `${request.nextUrl.origin}/api/oauth2/callback`;
    const oauth2Client = getGoogleOAuth2Client(redirectUri);
    const { tokens } = await oauth2Client.getToken(code);

    // Store tokens in database
    const { error: dbError } = await supabase.from('user_integrations').upsert({
      user_id: user.id,
      provider: 'google',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiry_date,
      updated_at: new Date().toISOString(),
    });

    if (dbError) {
      logger.error('Error storing tokens:', dbError);
      return redirect('/dashboard?error=db_error');
    }

    return redirect('/dashboard?success=google_connected');
  } catch (error) {
    // redirect()/notFound() above throw a NEXT_REDIRECT control-flow error that
    // must propagate to Next.js, not be treated as a real failure here.
    unstable_rethrow(error);

    // Pass a plain message/stack, not the raw error instance: some upstream
    // error shapes (e.g. Google API GaxiosError, which wraps a native fetch
    // Response) crash Sentry's exception capture in production.
    logger.error(
      'Error exchanging code for tokens:',
      error instanceof Error
        ? { message: error.message, name: error.name, stack: error.stack }
        : error
    );
    return redirect('/dashboard?error=token_exchange_error');
  }
}
