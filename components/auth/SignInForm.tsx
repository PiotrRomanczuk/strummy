'use client';

import { useState, useMemo, FormEvent } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import FormAlert from '@/components/shared/FormAlert';
import { Eye, EyeOff } from 'lucide-react';
import { SignInSchema } from '@/schemas/AuthSchema';

interface SignInFormProps {
  onSuccess?: () => void;
}

interface FieldErrors {
  email?: string;
  password?: string;
}

function EmailInput({
  value,
  onChange,
  onBlur,
  error,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        name="email"
        type="email"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required
        data-testid="signin-email"
        placeholder="you@example.com"
        aria-invalid={!!error}
        className={error ? 'border-destructive' : ''}
      />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  onBlur,
  showPassword,
  onToggleShow,
  error,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  showPassword: boolean;
  onToggleShow: () => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="password">Password</Label>
        <a
          href="/forgot-password"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Forgot password?
        </a>
      </div>
      <div className="relative">
        <Input
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          required
          data-testid="signin-password"
          className={error ? 'pr-10 border-destructive' : 'pr-10'}
          aria-invalid={!!error}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function SignInFooter() {
  return (
    <div className="space-y-2 text-sm">
      <p className="text-center text-muted-foreground">
        Don&apos;t have an account?{' '}
        <a href="/sign-up" className="text-primary hover:underline font-medium">
          Create your account
        </a>
      </p>
    </div>
  );
}

export default function SignInForm({ onSuccess }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  // Validate fields using useMemo to avoid setState in effect
  const fieldErrors = useMemo((): FieldErrors => {
    if (!touched.email && !touched.password) return {};

    const errors: FieldErrors = {};
    const result = SignInSchema.safeParse({ email, password });

    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as 'email' | 'password';
        if (touched[field] && !errors[field]) {
          errors[field] = issue.message;
        }
      }
    }

    return errors;
  }, [email, password, touched]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError(null); // Clear form-level error
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setError(null); // Clear form-level error
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setTouched({
      email: true,
      password: true,
    });

    const result = SignInSchema.safeParse({ email, password });
    if (!result.success) {
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = getSupabaseBrowserClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      if (signInError.message === 'Invalid login credentials') {
        setError(
          'Invalid email or password. If you haven\'t set a password yet, please use "Forgot password?" to create one.'
        );
      } else {
        setError(signInError.message);
      }
      return;
    }

    if (data.user) {
      setEmail('');
      setPassword('');
      setTouched({ email: false, password: false });
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full"
        >
          <svg
            className="h-5 w-5 mr-2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              className="fill-[#4285F4]"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              className="fill-[#34A853]"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              className="fill-[#FBBC05]"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              className="fill-[#EA4335]"
            />
          </svg>
          Continue with Google
        </Button>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-card text-muted-foreground">OR</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6" method="post">
        <EmailInput
          value={email}
          onChange={handleEmailChange}
          onBlur={() => setTouched({ ...touched, email: true })}
          error={fieldErrors.email}
        />
        <PasswordInput
          value={password}
          onChange={handlePasswordChange}
          onBlur={() => setTouched({ ...touched, password: true })}
          showPassword={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
          error={fieldErrors.password}
        />
        {error && <FormAlert type="error" message={error} />}
        <Button
          type="submit"
          disabled={loading}
          data-testid="signin-button"
          className="w-full"
        >
          {loading ? 'Signing in...' : 'Continue'}
        </Button>

        <SignInFooter />
      </form>
    </div>
  );
}
