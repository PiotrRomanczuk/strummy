'use client';

import { useId, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LessonPackage } from '@/lib/services/billing/billing-queries';

import { usePackageForm } from './usePackageForm';
import { useIsHydrated } from '@/hooks/useIsHydrated';
import { centsToPlnInput } from '@/lib/services/billing/package-price';

type Props = {
  /** The package being edited; absent for a new one. */
  pkg?: LessonPackage;
  onDone?: () => void;
};

const Field = ({ id, label, children }: { id: string; label: string; children: ReactNode }) => (
  <div className="grid gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    {children}
  </div>
);

/** Name, number of lessons and price of one package — add or edit. */
export const BillingSettingsPackageForm = ({ pkg, onDone }: Props) => {
  const t = useTranslations('Billing');
  const formId = useId();
  const { error, clearError, isPending, submit } = usePackageForm(pkg, onDone);
  const isHydrated = useIsHydrated();

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
      data-testid={pkg ? 'package-edit-form' : 'package-add-form'}
    >
      <Field id={`${formId}-name`} label={t('nameLabel')}>
        <Input
          id={`${formId}-name`}
          name="name"
          defaultValue={pkg?.name ?? ''}
          placeholder={t('namePlaceholder')}
          maxLength={80}
          required
        />
      </Field>
      <Field id={`${formId}-count`} label={t('lessonCountLabel')}>
        <Input
          id={`${formId}-count`}
          type="number"
          inputMode="numeric"
          min={1}
          max={100}
          name="lessonCount"
          defaultValue={pkg?.lessonCount ?? 4}
          required
        />
      </Field>
      <Field id={`${formId}-price`} label={t('priceLabel')}>
        <Input
          id={`${formId}-price`}
          inputMode="decimal"
          name="price"
          defaultValue={pkg ? centsToPlnInput(pkg.priceCents) : ''}
          onChange={clearError}
          placeholder="480"
          aria-invalid={error ? true : undefined}
          required
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending || !isHydrated}>
          {pkg ? t('save') : t('add')}
        </Button>
        {pkg && (
          <Button type="button" variant="ghost" onClick={onDone} disabled={isPending}>
            {t('cancel')}
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive sm:col-span-4">
          {error}
        </p>
      )}
    </form>
  );
};
