import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isRecoverySession, RESET_PASSWORD_PATH } from '@/lib/auth/recovery-session';
import { updateLastSignIn } from '@/app/actions/account';
import { logEmailConfirmed } from '@/lib/auth/auth-event-logger';
import { postLoginPath } from '@/lib/auth/post-login-redirect';

/** Non-dashboard targets an auth email may send through this callback. */
const CALLBACK_EXTRA_PATHS = ['/reset-password'] as const;

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // `next` is appended to an origin below, so it must be a validated
  // same-origin path: a raw value like `@host` or `//host` would leave the site.
  const requestedNext = postLoginPath(searchParams.get('next'), CALLBACK_EXTRA_PATHS);

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // A session from a reset link goes to the new-password form. GoTrue
      // rejects `?next=` on the redirect URL, so the session itself says so
      // (see lib/auth/recovery-session.ts).
      const isRecovery = isRecoverySession(data?.session?.access_token);
      const next = isRecovery ? RESET_PASSWORD_PATH : requestedNext;
      const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development';

      // Check if user needs onboarding
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await updateLastSignIn(user.id);
        logEmailConfirmed(user.email ?? '', user.id);

        // `profiles.id` is an independent PK from `auth.uid()` since the July
        // 27 rebuild — `user.id` here is the auth session id, so match on
        // `user_id`.
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_student, is_teacher, is_admin')
          .eq('user_id', user.id)
          .single();

        // A reset must reach the form even for an account without a role yet.
        if (!isRecovery && !profile?.is_student && !profile?.is_teacher && !profile?.is_admin) {
          const onboardingUrl = isLocalEnv
            ? `${origin}/onboarding`
            : forwardedHost
              ? `https://${forwardedHost}/onboarding`
              : `${origin}/onboarding`;
          return NextResponse.redirect(onboardingUrl);
        }
      }

      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        // Fallback to environment variables if origin is localhost (behind proxy) but not local env
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
        if (siteUrl && origin.includes('localhost')) {
          const baseUrl = siteUrl.replace(/\/$/, '');
          return NextResponse.redirect(`${baseUrl}${next}`);
        }
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
