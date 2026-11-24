/**
 * "This browser asked for a password reset" marker.
 *
 * GoTrue only honours redirect URLs that match its allow-list exactly, so the
 * reset mail cannot ask for `/auth/callback?next=/reset-password` — the query
 * makes it a different URL, GoTrue falls back to its site URL and the user
 * lands on the home page. The reset therefore asks for plain `/auth/callback`
 * (allow-listed everywhere for sign-up confirmation) and this short-lived
 * cookie, set when the reset is requested, tells the callback where to go.
 *
 * It lives in the same browser as the PKCE code verifier, which is already
 * required to complete the exchange, so it adds no new constraint.
 */
export const RECOVERY_INTENT_COOKIE = 'strummy-recovery-intent';
export const RECOVERY_INTENT_MAX_AGE_SECONDS = 60 * 60;
export const RESET_PASSWORD_PATH = '/reset-password';
