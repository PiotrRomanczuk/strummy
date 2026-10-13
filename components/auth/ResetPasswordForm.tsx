'use client';

import { useState, FormEvent } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import FormAlert from '@/components/shared/FormAlert';
import { Eye, EyeOff } from 'lucide-react';
import { ResetPasswordSchema } from '@/schemas/AuthSchema';
import { useAuthHashSession } from '@/components/auth/useAuthHashSession';
import { ResetPasswordLinkError } from '@/components/auth/ResetPasswordForm.LinkError';
import { translateAuthMessage } from '@/components/auth/auth-messages.helpers';

const EXPECTED_HASH_TYPES = ['recovery'] as const;

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
}

interface ResetPasswordFormProps {
  onSuccess?: () => void;
}

export default function ResetPasswordForm({ onSuccess }: ResetPasswordFormProps) {
  const t = useTranslations('Auth');
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
    expiredMessage: t('resetExpired'),
    invalidMessage: t('resetInvalid'),
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
          errors[field] = translateAuthMessage(t, issue.message);
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
      setError(translateAuthMessage(t, updateError.message));
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
    return <FormAlert type="success" title={t('resetSuccess')} message={t('redirecting')} />;
  }

  // No loading gate on purpose: the session check resolves in milliseconds, so a
  // spinner would only flash on the happy path (a PKCE cookie session, where the
  // form is immediately usable). The error branch below still fires long before
  // anyone finishes typing, which is the case that actually needed fixing.
  if (phase === 'error') {
    return <ResetPasswordLinkError message={sessionError ?? t('resetInvalid')} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="newPassword">{t('newPassword')}</Label>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showNewPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={handleNewPasswordChange}
            onBlur={() => setTouched({ ...touched, password: true })}
            required
            minLength={8}
            className={fieldErrors.password ? 'pr-10 border-destructive' : 'pr-10'}
            placeholder={t('enterNewPassword')}
            aria-invalid={!!fieldErrors.password}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showNewPassword ? t('hidePassword') : t('showPassword')}
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
          <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            onBlur={() => setTouched({ ...touched, confirmPassword: true })}
            required
            minLength={8}
            className={fieldErrors.confirmPassword ? 'pr-10 border-destructive' : 'pr-10'}
            placeholder={t('confirmNewPassword')}
            aria-invalid={!!fieldErrors.confirmPassword}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showConfirmPassword ? t('hidePassword') : t('showPassword')}
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
        {loading ? t('resetting') : t('resetPasswordButton')}
      </Button>
    </form>
  );
}
