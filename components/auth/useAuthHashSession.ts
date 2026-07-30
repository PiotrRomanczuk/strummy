'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type AuthHashPhase = 'loading' | 'ready' | 'error';

type Options = {
  /**
   * GoTrue `type` values this page accepts (e.g. `['invite']`, `['recovery']`).
   * A hash carrying a different type is ignored, so an invite link cannot
   * silently establish a session on the reset-password page or vice versa.
   */
  expectedTypes: readonly string[];
  /** Shown when GoTrue reports the link expired, or a token exchange fails. */
  expiredMessage: string;
  /** Shown when there is no usable token and no existing session. */
  invalidMessage: string;
};

type Result = { phase: AuthHashPhase; error: string | null };

/**
 * Establish a Supabase session from a GoTrue email-link redirect.
 *
 * GoTrue hands the session over in the URL **fragment**
 * (`/page#access_token=…&refresh_token=…&type=recovery`) for links that were not
 * initiated with a PKCE challenge — admin-generated links, and anything sent via
 * the Auth admin API. Fragments never reach the server, so `/auth/callback` and
 * its `exchangeCodeForSession` cannot see them: the consuming page has to read
 * the hash client-side. Without this, the page renders with no session at all
 * and the first `updateUser()` fails with "Auth session missing!".
 *
 * The browser-initiated PKCE flow is unaffected and still preferred: it arrives
 * as `?code=` → `/auth/callback` → cookie session, and lands here with no hash,
 * which the `getUser()` fallback below resolves to `ready`.
 */
export function useAuthHashSession({
  expectedTypes,
  expiredMessage,
  invalidMessage,
}: Options): Result {
  const [phase, setPhase] = useState<AuthHashPhase>('loading');
  const [error, setError] = useState<string | null>(null);

  // Captured during the FIRST RENDER, deliberately — not inside the effect.
  // AuthHashErrorBanner (root layout) also inspects error hashes and calls
  // history.replaceState to clear them, and effect order between it and this
  // hook is not guaranteed. Reading in an effect made the outcome a race:
  // whoever ran second saw an empty hash. Verified against the dev stack —
  // the page reported the generic "invalid" message instead of "expired"
  // because the banner had already stripped it.
  const [initialHash] = useState(() => (typeof window === 'undefined' ? '' : window.location.hash));

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    const fail = (message: string) => {
      if (cancelled) return;
      setError(message);
      setPhase('error');
    };

    const succeed = () => {
      if (cancelled) return;
      setPhase('ready');
    };

    const params = new URLSearchParams(
      initialHash.startsWith('#') ? initialHash.slice(1) : initialHash
    );

    const stripHash = () => {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    };

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const hashType = params.get('type');

    if (accessToken && refreshToken && hashType && expectedTypes.includes(hashType)) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error: sessionError }) => {
          if (sessionError) {
            fail(expiredMessage);
            return;
          }
          // Drop the tokens from the address bar so they are not kept in
          // history or leaked via a copied URL.
          stripHash();
          succeed();
        })
        .catch(() => fail(expiredMessage));
      return;
    }

    if (params.has('error') || params.has('error_code')) {
      const code = params.get('error_code') ?? params.get('error') ?? '';
      const description = params.get('error_description')?.replace(/\+/g, ' ') ?? '';
      const isExpired = code === 'otp_expired' || description.toLowerCase().includes('expired');
      stripHash();
      // Defer so the message cannot be swallowed by the same commit that
      // replaced the URL.
      Promise.resolve().then(() =>
        fail(isExpired ? expiredMessage : description || invalidMessage)
      );
      return;
    }

    // No usable hash. Either the PKCE flow already set a cookie session
    // (the normal in-app path), or the link is spent.
    supabase.auth
      .getUser()
      .then(({ data: { user } }) => (user ? succeed() : fail(invalidMessage)))
      .catch(() => fail(invalidMessage));

    return () => {
      cancelled = true;
    };
    // expectedTypes is a literal array at both call sites; joined so a new array
    // identity per render does not re-run the exchange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectedTypes.join(','), expiredMessage, invalidMessage, initialHash]);

  return { phase, error };
}
