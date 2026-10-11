'use client';

import { useState, FormEvent } from 'react';
import { resetPassword } from '@/app/auth/actions';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import FormAlert from '@/components/shared/FormAlert';
import { ForgotPasswordSchema } from '@/schemas/AuthSchema';
import { AuthAccent, AuthHeader } from './AuthLayout';
import { ForgotPasswordSent } from './ForgotPasswordForm.Sent';

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
}

export default function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState(false);

  const getFieldError = (): string | null => {
    if (!touched) return null;

    const result = ForgotPasswordSchema.safeParse({ email });
    if (result.success) return null;

    return result.error.issues[0]?.message || 'Invalid email';
  };

  const fieldError = getFieldError();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null); // Clear form-level error
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);

    const result = ForgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const resetResult = await resetPassword(email);

    setLoading(false);

    if (resetResult.error) {
      setError(resetResult.error);
      return;
    }

    setSuccess(true);
    if (onSuccess) {
      onSuccess();
    }
  };

  if (success) {
    return (
      <ForgotPasswordSent
        email={email}
        isResending={loading}
        onResend={async () => {
          setLoading(true);
          const resend = await resetPassword(email);
          setLoading(false);
          setError(resend.error ?? null);
        }}
        error={error}
        onChangeEmail={() => setSuccess(false)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <AuthHeader
        eyebrow="Reset password"
        title={
          <>
            Forgot your <AuthAccent>password</AuthAccent>?
          </>
        }
        subtitle="Enter your email and we'll send you a reset link."
      />

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          onBlur={() => setTouched(true)}
          required
          placeholder="you@example.com"
          aria-invalid={!!fieldError}
          className={fieldError ? 'border-destructive' : ''}
        />
        {fieldError && (
          <p className="text-sm text-destructive" role="alert">
            {fieldError}
          </p>
        )}
      </div>

      {error && <FormAlert type="error" message={error} />}

      <button type="submit" disabled={loading} className="ui-auth-primary">
        {loading ? 'Sending...' : 'Send reset link'}
      </button>

      <p
        style={{
          margin: 0,
          paddingTop: 18,
          borderTop: '1px solid var(--rule)',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--ink-4)',
        }}
      >
        <a
          href="/sign-in"
          style={{ color: 'var(--gold-2)', fontWeight: 500, textDecoration: 'none' }}
        >
          ← Back to sign in
        </a>
      </p>
    </form>
  );
}
