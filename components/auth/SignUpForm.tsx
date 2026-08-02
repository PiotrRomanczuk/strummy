'use client';

import { useSignUpLogic } from './useSignUpLogic';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import FormAlert from '@/components/shared/FormAlert';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';

interface SignUpFormProps {
  onSuccess?: () => void;
}

function NameInputs({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  onFirstNameBlur,
  onLastNameBlur,
  firstNameError,
  lastNameError,
}: {
  firstName: string;
  lastName: string;
  onFirstNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLastNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFirstNameBlur: () => void;
  onLastNameBlur: () => void;
  firstNameError?: string;
  lastNameError?: string;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="firstName">First Name</Label>
        <Input
          id="firstName"
          name="firstName"
          type="text"
          value={firstName}
          onChange={onFirstNameChange}
          onBlur={onFirstNameBlur}
          required
          aria-invalid={!!firstNameError}
          className={firstNameError ? 'border-destructive' : ''}
        />
        {firstNameError && (
          <p className="text-sm text-destructive" role="alert">
            {firstNameError}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="lastName">Last Name</Label>
        <Input
          id="lastName"
          name="lastName"
          type="text"
          value={lastName}
          onChange={onLastNameChange}
          onBlur={onLastNameBlur}
          required
          aria-invalid={!!lastNameError}
          className={lastNameError ? 'border-destructive' : ''}
        />
        {lastNameError && (
          <p className="text-sm text-destructive" role="alert">
            {lastNameError}
          </p>
        )}
      </div>
    </div>
  );
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
      <Label htmlFor="email">Email Address</Label>
      <Input
        id="email"
        name="email"
        type="email"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required
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
  showStrength = false,
  error,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  showStrength?: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="password">Password</Label>
      <Input
        id="password"
        name="password"
        type="password"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required
        minLength={6}
        aria-invalid={!!error}
        className={error ? 'border-destructive' : ''}
      />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {showStrength && !error && <PasswordStrengthIndicator password={value} />}
    </div>
  );
}

function ConfirmPasswordInput({
  value,
  onChange,
  onBlur,
  passwordMatch,
  error,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  passwordMatch: boolean;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="confirmPassword">Confirm Password</Label>
      <Input
        id="confirmPassword"
        name="confirmPassword"
        type="password"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        required
        minLength={6}
        aria-invalid={!!error}
        className={error ? 'border-destructive' : ''}
      />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {value && !error && (
        <div className="flex items-center gap-2 text-xs">
          {passwordMatch ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span className="text-success">Passwords match</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-destructive">Passwords do not match</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PrivacyConsentCheckbox({
  checked,
  onChange,
  showError,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  showError: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          id="privacyConsent"
          name="privacyConsent"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={showError}
          className="mt-0.5"
        />
        <span>
          I have read and accept the{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Privacy Policy
          </a>
        </span>
      </label>
      {showError && (
        <p className="text-sm text-destructive" role="alert">
          You must accept the Privacy Policy to create an account.
        </p>
      )}
    </div>
  );
}

function SignUpFooter() {
  return (
    <p className="text-center text-sm text-muted-foreground">
      Already have an account?{' '}
      <a href="/sign-in" className="text-primary hover:underline font-medium">
        Sign in
      </a>
    </p>
  );
}

export default function SignUpForm({ onSuccess }: SignUpFormProps) {
  const state = useSignUpLogic(onSuccess);

  return (
    <form onSubmit={state.handleSubmit} className="space-y-6">
      <NameInputs
        firstName={state.firstName}
        lastName={state.lastName}
        onFirstNameChange={(e) => {
          state.setFirstName(e.target.value);
          if (state.touched.firstName) {
            state.setTouched({ ...state.touched, firstName: false });
          }
        }}
        onLastNameChange={(e) => {
          state.setLastName(e.target.value);
          if (state.touched.lastName) {
            state.setTouched({ ...state.touched, lastName: false });
          }
        }}
        onFirstNameBlur={() => state.setTouched({ ...state.touched, firstName: true })}
        onLastNameBlur={() => state.setTouched({ ...state.touched, lastName: true })}
        firstNameError={state.fieldErrors?.firstName}
        lastNameError={state.fieldErrors?.lastName}
      />

      <EmailInput
        value={state.email}
        onChange={(e) => {
          state.setEmail(e.target.value);
          if (state.touched.email) {
            state.setTouched({ ...state.touched, email: false });
          }
        }}
        onBlur={() => state.setTouched({ ...state.touched, email: true })}
        error={state.fieldErrors?.email}
      />

      <PasswordInput
        value={state.password}
        onChange={(e) => {
          state.setPassword(e.target.value);
          if (state.touched.password) {
            state.setTouched({ ...state.touched, password: false });
          }
        }}
        onBlur={() => state.setTouched({ ...state.touched, password: true })}
        showStrength={true}
        error={state.fieldErrors?.password}
      />

      <ConfirmPasswordInput
        value={state.confirmPassword}
        onChange={(e) => {
          state.setConfirmPassword(e.target.value);
          if (state.touched.confirmPassword) {
            state.setTouched({ ...state.touched, confirmPassword: false });
          }
        }}
        onBlur={() => state.setTouched({ ...state.touched, confirmPassword: true })}
        passwordMatch={state.password === state.confirmPassword}
        error={state.fieldErrors?.confirmPassword}
      />

      <PrivacyConsentCheckbox
        checked={state.privacyConsent}
        onChange={state.setPrivacyConsent}
        showError={state.consentTouched && !state.privacyConsent}
      />

      {state.error && <FormAlert type="error" message={state.error} />}
      {state.success && (
        <Alert className="border-success/50 bg-success/10">
          <Mail className="h-4 w-4 text-success" />
          <AlertDescription className="text-success">
            <div className="space-y-2">
              <p className="font-semibold">Verification Email Sent!</p>
              <p className="text-sm">
                We&apos;ve sent a confirmation email to: <strong>{state.email}</strong>
              </p>
              <div className="text-sm space-y-1">
                <p className="font-medium">What to do next:</p>
                <ol className="list-decimal list-inside space-y-0.5 ml-2">
                  <li>Check your inbox (and spam folder)</li>
                  <li>Click the verification link</li>
                  <li>You&apos;ll be redirected back to sign in</li>
                </ol>
              </div>
              {state.canResendEmail && (
                <button
                  type="button"
                  onClick={state.handleResendEmail}
                  disabled={state.resendLoading || state.resendCountdown > 0}
                  className="mt-2 text-sm text-success underline hover:text-success/80 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state.resendCountdown > 0
                    ? `Resend available in ${state.resendCountdown}s`
                    : state.resendLoading
                      ? 'Sending...'
                      : "Didn't receive the email? Resend Verification Email"}
                </button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={state.loading} className="w-full">
        {state.loading ? 'Signing up...' : 'Sign Up'}
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-card text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={state.handleGoogleSignIn}
        disabled={state.loading}
        className="w-full"
      >
        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
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

      <SignUpFooter />
    </form>
  );
}
