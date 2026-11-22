import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import {
  SPOTIFY_TOKEN_COOKIE,
  SPOTIFY_TOKEN_COOKIE_MAX_AGE_SECONDS,
  SPOTIFY_TOKEN_COOKIE_PATH,
} from '@/lib/spotify-token-handoff';

/**
 * GET /api/spotify/callback?code=...
 * Exchanges the OAuth authorization code for access + refresh tokens.
 * The refresh token is handed to the admin page through a one-time httpOnly
 * cookie (see `lib/spotify-token-handoff.ts`) for manual storage in env vars —
 * never in the redirect URL and never in the logs.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    logger.error('[spotify-callback] OAuth error', { error });
    return NextResponse.redirect(
      new URL(`/dashboard/admin/spotify-connect?error=${encodeURIComponent(error)}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/dashboard/admin/spotify-connect?error=missing_code', request.url)
    );
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: 'Spotify credentials not configured' }, { status: 500 });
  }

  // Exchange code for tokens
  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    logger.error('[spotify-callback] Token exchange failed', {
      status: String(tokenResponse.status),
      body: errorBody,
    });
    return NextResponse.redirect(
      new URL('/dashboard/admin/spotify-connect?error=token_exchange_failed', request.url)
    );
  }

  const tokenData = await tokenResponse.json();
  const refreshToken: unknown = tokenData.refresh_token;

  if (typeof refreshToken !== 'string' || !refreshToken) {
    logger.error('[spotify-callback] Token response had no refresh_token');
    return NextResponse.redirect(
      new URL('/dashboard/admin/spotify-connect?error=no_refresh_token', request.url)
    );
  }

  logger.info('[spotify-callback] OAuth successful, refresh token handed to the admin page');

  const response = NextResponse.redirect(
    new URL('/dashboard/admin/spotify-connect?success=true', request.url)
  );
  response.cookies.set(SPOTIFY_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: SPOTIFY_TOKEN_COOKIE_PATH,
    maxAge: SPOTIFY_TOKEN_COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
