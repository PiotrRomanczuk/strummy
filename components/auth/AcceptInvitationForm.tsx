'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { StrongPasswordSchema } from '@/schemas/AuthSchema';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { Button } from '@/components/ui/button';
import FormAlert from '@/components/shared/FormAlert';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuthHashSession } from '@/components/auth/useAuthHashSession';

const EXPECTED_HASH_TYPES = ['invite'] as const;
const EXPIRED_MESSAGE =
  'This invitation link has expired. Please ask your teacher to send a new invite.';
const INVALID_MESSAGE = 'This invitation link appears to be invalid or expired.';

export default function AcceptInvitationForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Shared with ResetPasswordForm — GoTrue hands the session over in the URL
  // fragment for links not initiated with a PKCE challenge. Keeping one
  // implementation is deliberate: this page had the fix and reset-password
  // did not, which is how "Auth session missing!" shipped there.
  const { phase, error: initError } = useAuthHashSession({
    expectedTypes: EXPECTED_HASH_TYPES,
    expiredMessage: EXPIRED_MESSAGE,
    invalidMessage: INVALID_MESSAGE,
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const passwordResult = StrongPasswordSchema.safeParse(password);
    if (!passwordResult.success) {
      setSubmitError(passwordResult.error.issues[0].message);
      return;
    }
    if (password !== confirmPassword) {
      setSubmitError("Passwords don't match");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      setSubmitError(error.message);
      return;
    }

    router.push('/onboarding');
  };

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Verifying your invite…
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="text-center text-sm text-muted-foreground">
        <p>{initError}</p>
        <p className="mt-2">
          <a href="/sign-up" className="text-primary hover:underline">
            Create a new account
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PasswordInput
        id="password"
        label="Create Password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setSubmitError(null);
        }}
        showStrength
        autoComplete="new-password"
      />
      <PasswordInput
        id="confirmPassword"
        label="Confirm Password"
        value={confirmPassword}
        onChange={(e) => {
          setConfirmPassword(e.target.value);
          setSubmitError(null);
        }}
        autoComplete="new-password"
      />
      {submitError && <FormAlert type="error" message={submitError} />}
      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-12 rounded-lg font-bold text-base mt-2"
      >
        {submitting ? 'Setting up…' : 'Set Password & Continue'}
        {!submitting && <ArrowRight className="ml-2 h-5 w-5" />}
      </Button>
    </form>
  );
}
