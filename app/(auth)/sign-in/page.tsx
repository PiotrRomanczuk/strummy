'use client';

import { useEffect, useState, useMemo, useRef, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { SignInSchema } from '@/schemas/AuthSchema';
import { signIn as signInAction, resendVerificationEmail } from '@/app/auth/actions';
import {
  AuthAccent,
  AuthDivider,
  AuthHeader,
  AuthLayout,
  DbConnectionIndicator,
  DevQuickLogin,
} from '@/components/auth';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FormAlert from '@/components/shared/FormAlert';
import { Mail, ArrowRight, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DEMO_PASSWORD, DEMO_TEACHER_EMAIL } from '@/lib/demo/demo-accounts.constants';
import { postLoginPath } from '@/lib/auth/post-login-redirect';
import { translateAuthMessage } from '@/components/auth/auth-messages.helpers';

export default function SignInPage() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  // Return to the page that bounced an expired or missing session here.
  const nextPath = postLoginPath(searchParams.get('redirect'));
  const demoTriggered = useRef(false);
  const [isChecking, setIsChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false, password: false });

  useEffect(() => {
    let cancelled = false;
    const checkUser = async () => {
      const supabase = createClient();
      // getUser() can hang (supabase-js navigator.locks contention, common under
      // dev HMR) — never strand the user on the loading screen. Race it against a
      // timeout and fall through to the form on hang/error.
      const resolveUser = supabase.auth
        .getUser()
        .then((res) => res.data.user)
        .catch(() => null);
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
      const user = await Promise.race([resolveUser, timeout]);
      if (cancelled) return;
      if (user) {
        router.push(nextPath);
      } else {
        setIsChecking(false);
      }
    };
    checkUser();
    return () => {
      cancelled = true;
    };
  }, [router, nextPath]);

  // Auto-fill demo credentials when ?demo=true
  const isDemo = searchParams.get('demo') === 'true' && !isChecking;
  useEffect(() => {
    if (!isDemo || demoTriggered.current) return;
    demoTriggered.current = true;
    // Defer state updates to avoid synchronous setState in effect
    requestAnimationFrame(() => {
      setEmail(DEMO_TEACHER_EMAIL);
      setPassword(DEMO_PASSWORD);
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) form.requestSubmit();
      }, 150);
    });
  }, [isDemo]);

  // Validate fields using useMemo to avoid setState in effect
  const fieldErrors = useMemo(() => {
    if (!touched.email && !touched.password) return {};

    const errors: { email?: string; password?: string } = {};
    const result = SignInSchema.safeParse({ email, password });
    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as 'email' | 'password';
        if (touched[field] && !errors[field]) {
          errors[field] = translateAuthMessage(t, issue.message);
        }
      }
    }
    return errors;
  }, [email, password, touched, t]);

  const performSignIn = async (emailValue: string, passwordValue: string) => {
    setLoading(true);
    setError(null);
    setEmailNotConfirmed(false);
    setResendStatus(null);

    const signInResult = await signInAction(emailValue, passwordValue);

    setLoading(false);

    if (signInResult.error) {
      setError(translateAuthMessage(t, signInResult.error));
      setEmailNotConfirmed('emailNotConfirmed' in signInResult && !!signInResult.emailNotConfirmed);
      return;
    }

    if ('success' in signInResult && signInResult.success) {
      router.refresh();
      router.push(nextPath);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    const validation = SignInSchema.safeParse({ email, password });
    if (!validation.success) return;

    await performSignIn(email, password);
  };

  // One-click dev role logins (only rendered when connected to the dev DB).
  const handleQuickLogin = (quickEmail: string, quickPassword: string) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    void performSignIn(quickEmail, quickPassword);
  };

  const handleResend = async () => {
    setLoading(true);
    setResendStatus(null);
    const result = await resendVerificationEmail(email);
    setLoading(false);
    setResendStatus(result.error ? translateAuthMessage(t, result.error) : t('confirmationSent'));
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">{t('loading')}</div>
      </div>
    );
  }

  return (
    <AuthLayout>
      <DbConnectionIndicator />
      <AuthHeader
        eyebrow={t('signInEyebrow')}
        title={
          <>
            {t('signInTitle')} <AuthAccent>{t('signInAccent')}</AuthAccent>.
          </>
        }
        subtitle={t('signInSubtitle')}
      />

      <DevQuickLogin onLogin={handleQuickLogin} disabled={loading} />

      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            {t('email')}
          </Label>
          <div className="relative">
            <Mail className="ui-auth-lead-icon absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              name="email"
              type="email"
              data-testid="signin-email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              onBlur={() => setTouched({ ...touched, email: true })}
              placeholder="name@example.com"
              aria-invalid={!!fieldErrors.email}
              className={cn(
                'h-12 pl-10 rounded-lg bg-card dark:bg-background border-0 focus:ring-2 focus:ring-primary/50',
                fieldErrors.email && 'ring-2 ring-destructive/50'
              )}
            />
          </div>
          {fieldErrors.email && (
            <p className="text-sm text-destructive" role="alert">
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password Field */}
        <PasswordInput
          id="password"
          label={t('password')}
          data-testid="signin-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          onBlur={() => setTouched({ ...touched, password: true })}
          error={fieldErrors.password}
          showForgotPassword
          autoComplete="current-password"
        />

        {/* Form Error */}
        {error && <FormAlert type="error" message={error} />}

        {/* Resend confirmation when the account exists but isn't confirmed yet */}
        {emailNotConfirmed && (
          <button
            type="button"
            disabled={loading}
            onClick={handleResend}
            className="ui-auth-secondary"
          >
            {t('resendConfirmation')}
          </button>
        )}
        {resendStatus && (
          <p className="text-sm text-center text-muted-foreground" role="status">
            {resendStatus}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          data-testid="signin-button"
          className="ui-auth-primary"
          style={{ marginTop: 4 }}
        >
          {loading ? t('signingIn') : t('signIn')}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      <AuthDivider />
      <button
        type="button"
        className="ui-auth-secondary"
        disabled={loading}
        onClick={() => {
          setEmail(DEMO_TEACHER_EMAIL);
          setPassword(DEMO_PASSWORD);
          setTimeout(() => {
            const form = document.querySelector('form');
            if (form) form.requestSubmit();
          }, 100);
        }}
      >
        <Play className="h-4 w-4" /> {t('tryDemo')}
      </button>

      {/* Footer. Accounts are created by invitation only — a teacher invites
          their students, and teachers themselves come through the interest
          form — so there is nothing to point a stranger at but that form. */}
      <div
        style={{
          paddingTop: 18,
          borderTop: '1px solid var(--rule)',
          fontSize: 12,
          color: 'var(--ink-4)',
          textAlign: 'center',
        }}
      >
        {t('newToStrummy')}{' '}
        <Link
          href="/for-teachers"
          data-testid="signin-for-teachers"
          style={{ color: 'var(--gold-2)', fontWeight: 500, textDecoration: 'none' }}
        >
          {t('startStudio')}
        </Link>
      </div>
    </AuthLayout>
  );
}
