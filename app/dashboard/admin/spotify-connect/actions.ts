'use server';

import { cookies } from 'next/headers';

import { getUserWithRolesSSR } from '@/lib/getUserWithRolesSSR';
import { SPOTIFY_TOKEN_COOKIE, SPOTIFY_TOKEN_COOKIE_PATH } from '@/lib/spotify-token-handoff';

/**
 * Returns the refresh token parked by `/api/spotify/callback` and deletes the
 * cookie, so the token can be read exactly once. Admin only; a non-admin never
 * consumes (or sees) the cookie.
 */
export async function consumeSpotifyRefreshToken(): Promise<string | null> {
  const { isAdmin } = await getUserWithRolesSSR();
  if (!isAdmin) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(SPOTIFY_TOKEN_COOKIE)?.value ?? null;
  if (token) cookieStore.delete({ name: SPOTIFY_TOKEN_COOKIE, path: SPOTIFY_TOKEN_COOKIE_PATH });
  return token;
}
