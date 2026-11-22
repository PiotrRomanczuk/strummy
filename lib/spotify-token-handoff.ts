/**
 * One-time hand-off of the Spotify refresh token from the OAuth callback to the
 * admin page. The token never travels in a URL (history, Referer, access logs):
 * the callback parks it in a short-lived httpOnly cookie scoped to the admin
 * page, and a Server Action reads it once and deletes it.
 */
export const SPOTIFY_TOKEN_COOKIE = 'spotify_refresh_token_once';
export const SPOTIFY_TOKEN_COOKIE_PATH = '/dashboard/admin/spotify-connect';
export const SPOTIFY_TOKEN_COOKIE_MAX_AGE_SECONDS = 300;
