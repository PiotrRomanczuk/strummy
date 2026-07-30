'use client';

import { useState, FormEvent } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import FormAlert from '@/components/shared/FormAlert';
import { Eye, EyeOff } from 'lucide-react';
import { ResetPasswordSchema } from '@/schemas/AuthSchema';
import { useAuthHashSession } from '@/components/auth/useAuthHashSession';
import { ResetPasswordLinkError } from '@/components/auth/ResetPasswordForm.LinkError';

const EXPECTED_HASH_TYPES = ['recovery'] as const;
const EXPIRED_MESSAGE =
  'This password reset link has expired. Request a new one from the sign-in page.';
const INVALID_MESSAGE =
  'This password reset link is invalid or has already been used. Request a new one from the sign-in page.';

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
}

interface ResetPasswordFormProps {
  onSuccess?: () => void;
}

export default function ResetPasswordForm({ onSuccess }: ResetPasswordFormProps) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  });

  // Recovery links arrive with the session in the URL fragment, which never
  // reaches the server. Without consuming it here, updateUser() below fails
  // with "Auth session missing!" — a message that tells the user nothing.
  const { phase, error: sessionError } = useAuthHashSession({
    expectedTypes: EXPECTED_HASH_TYPES,
    expiredMessage: EXPIRED_MESSAGE,
    invalidMessage: INVALID_MESSAGE,
  });

  const getFieldErrors = (): FieldErrors => {
    const errors: FieldErrors = {};
    const result = ResetPasswordSchema.safeParse({
      password: newPassword,
      confirmPassword,
    });

    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as 'password' | 'confirmPassword';
        if (touched[field] && !errors[field]) {
          errors[field] = issue.message;
        }
      }
    }

    return errors;
  };

  const fieldErrors = getFieldErrors();

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
    setError(null);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      password: true,
      confirmPassword: true,
    });

    const result = ResetPasswordSchema.safeParse({
      password: newPassword,
      confirmPassword,
    });

    if (!result.success) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(true);
    if (onSuccess) {
      onSuccess();
    } else {
      // Default behavior: redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    }
  };

  if (success) {
    return (
      <FormAlert
        type="success"
        title="Password reset successfully"
        message="Redirecting to dashboard..."
      />
    );
  }

  // No loading gate on purpose: the session check resolves in milliseconds, so a
  // spinner would only flash on the happy path (a PKCE cookie session, where the
  // form is immediately usable). The error branch below still fires long before
  // anyone finishes typing, which is the case that actually needed fixing.
  if (phase === 'error') {
    return <ResetPasswordLinkError message={sessionError ?? INVALID_MESSAGE} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={handleNewPasswordChange}
            onBlur={() => setTouched({ ...touched, password: true })}
            required
            minLength={6}
            className={fieldErrors.password ? 'pr-10 border-destructive' : 'pr-10'}
            placeholder="Enter new password"
            aria-invalid={!!fieldErrors.password}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showNewPassword ? 'Hide password' : 'Show password'}
          >
            {showNewPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {fieldErrors.password && (
          <p className="text-sm text-destructive" role="alert">
            {fieldErrors.password}
          </p>
        )}
        {!fieldErrors.password && (
          <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            onBlur={() => setTouched({ ...touched, confirmPassword: true })}
            required
            minLength={6}
            className={fieldErrors.confirmPassword ? 'pr-10 border-destructive' : 'pr-10'}
            placeholder="Confirm new password"
            aria-invalid={!!fieldErrors.confirmPassword}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {fieldErrors.confirmPassword && (
          <p className="text-sm text-destructive" role="alert">
            {fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      {error && <FormAlert type="error" message={error} />}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Resetting...' : 'Reset Password'}
      </Button>
    </form>
  );
}
