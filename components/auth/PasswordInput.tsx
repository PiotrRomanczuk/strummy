'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Lock, Check, Circle } from 'lucide-react';

interface PasswordInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  error?: string;
  showStrength?: boolean;
  showForgotPassword?: boolean;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  'data-testid'?: string;
}

interface PasswordRequirement {
  id: string;
  /** `Auth.*` message key. */
  labelKey: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { id: 'length', labelKey: 'reqLength', test: (p) => p.length >= 8 },
  { id: 'letter', labelKey: 'reqLetter', test: (p) => /[a-zA-Z]/.test(p) },
  { id: 'number', labelKey: 'reqNumber', test: (p) => /[0-9]/.test(p) },
  { id: 'special', labelKey: 'reqSpecial', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

/** 0–4: one point per requirement met; the label is `Auth.strength{level}`. */
function calculateStrength(password: string): { level: number; metCount: number } {
  const metCount = requirements.filter((r) => r.test(password)).length;
  return { level: metCount, metCount };
}

/**
 * Password input with visibility toggle and optional strength meter
 * Features:
 * - 4-segment color bar (red/yellow/green/gold)
 * - Requirements checklist in 2-column grid
 * - Left icon (lock)
 */
function PasswordInput({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  showStrength = false,
  showForgotPassword = false,
  placeholder = '••••••••',
  className,
  autoComplete = 'current-password',
  'data-testid': dataTestId,
}: PasswordInputProps) {
  const t = useTranslations('Auth');
  const [showPassword, setShowPassword] = React.useState(false);
  const strength = showStrength ? calculateStrength(value) : null;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label row with optional forgot password link */}
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {showForgotPassword && (
          <a
            href="/forgot-password"
            className="text-xs font-medium text-primary hover:underline underline-offset-4"
          >
            {t('forgotPassword')}
          </a>
        )}
      </div>

      {/* Input with icons */}
      <div className="ui-auth-pw relative">
        <Lock className="ui-auth-lead-icon absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          name={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={!!error}
          data-testid={dataTestId}
          className={cn(
            'h-12 pl-10 pr-10 rounded-lg',
            'bg-card dark:bg-background',
            'border-0 focus:ring-2 focus:ring-primary/50',
            error && 'ring-2 ring-destructive/50'
          )}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={showPassword ? t('hidePassword') : t('showPassword')}
        >
          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {/* Strength meter */}
      {showStrength && value && strength && (
        <div className="mt-2 space-y-2">
          {/* Multi-color bar */}
          <div className="flex gap-1.5 h-1.5 w-full px-1">
            {[0, 1, 2, 3].map((index) => {
              let bgColor = 'bg-muted';
              if (index < strength.level) {
                if (index === 0) bgColor = 'bg-destructive';
                else if (index === 1) bgColor = 'bg-warning';
                else if (index === 2) bgColor = 'bg-success';
                else bgColor = 'bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]';
              }
              return (
                <div key={index} className={cn('flex-1 rounded-full transition-colors', bgColor)} />
              );
            })}
          </div>

          {/* Strength label */}
          <div className="flex justify-between items-center px-1">
            <span
              className={cn(
                'text-xs font-medium',
                strength.level >= 3
                  ? 'text-primary'
                  : strength.level >= 2
                    ? 'text-success'
                    : strength.level >= 1
                      ? 'text-warning'
                      : 'text-destructive'
              )}
            >
              {t(`strength${strength.level}`)}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              {strength.metCount}/4
            </span>
          </div>

          {/* Requirements checklist - 2 column grid */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 mt-2 px-1">
            {requirements.map((req) => {
              const met = req.test(value);
              return (
                <div
                  key={req.id}
                  className={cn(
                    'flex items-center gap-1.5 text-xs font-medium transition-colors',
                    met ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {met ? (
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                  {t(req.labelKey)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export { PasswordInput };
