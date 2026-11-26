/**
 * "This session comes from a password-reset link."
 *
 * GoTrue only honours redirect URLs that match its allow-list exactly, so the
 * reset mail cannot ask for `/auth/callback?next=/reset-password` — the query
 * makes it a different URL, GoTrue falls back to its site URL and the user
 * lands on the home page. The reset therefore asks for plain `/auth/callback`
 * (allow-listed everywhere for sign-up confirmation), and the callback tells a
 * reset from any other sign-in by the session itself: in the PKCE flow GoTrue
 * issues it with the authentication method `recovery`, which the access token
 * carries in its `amr` claim. Nothing outlives the exchange, so a later OAuth
 * sign-in or sign-up confirmation in the same browser goes where it asked to.
 */
export const RESET_PASSWORD_PATH = '/reset-password';

interface AmrEntry {
  method?: unknown;
}

/** True when the token's most recent authentication method is `recovery`. */
export function isRecoverySession(accessToken: string | null | undefined): boolean {
  const payload = accessToken?.split('.')[1];
  if (!payload) return false;
  try {
    const claims: { amr?: unknown } = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8')
    );
    if (!Array.isArray(claims.amr) || claims.amr.length === 0) return false;
    // GoTrue orders amr most-recent first.
    return (claims.amr[0] as AmrEntry).method === 'recovery';
  } catch {
    return false;
  }
}
