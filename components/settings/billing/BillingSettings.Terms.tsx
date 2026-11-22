'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { saveBillingSettings } from '@/app/actions/billing-settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { BillingSettings } from '@/lib/services/billing/billing-queries';
import { useIsHydrated } from '@/hooks/useIsHydrated';

type Props = { settings: BillingSettings };

type SaveState = 'idle' | 'saved' | 'failed';

/** From which day held lessons count, and how long a student has to pay. */
export const BillingSettingsTerms = ({ settings }: Props) => {
  const t = useTranslations('Billing');
  const router = useRouter();
  const isHydrated = useIsHydrated();
  const [state, setState] = useState<SaveState>('idle');
  const [isPending, startTransition] = useTransition();

  // Uncontrolled inputs, read on submit: React leaves a value typed before
  // hydration in place, where a controlled input would reset it to its state.
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setState('idle');
    startTransition(async () => {
      const result = await saveBillingSettings({
        billingStartOn: String(fields.get('billingStartOn') ?? ''),
        paymentTermDays: String(fields.get('paymentTermDays') ?? ''),
      });
      if ('error' in result) {
        setState('failed');
        return;
      }
      setState('saved');
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-border bg-card" data-testid="billing-terms">
      <div className="border-b border-border px-5 py-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {t('termsEyebrow')}
        </p>
        <h2 className="text-lg font-semibold tracking-tight">{t('termsTitle')}</h2>
      </div>
      <form onSubmit={submit} className="grid gap-4 px-5 py-4">
        <div className="grid gap-1.5 sm:max-w-xs">
          <Label htmlFor="billing-start-on">{t('startLabel')}</Label>
          <Input
            id="billing-start-on"
            name="billingStartOn"
            type="date"
            defaultValue={settings.billingStartOn ?? ''}
          />
        </div>
        <p className="max-w-prose text-sm text-muted-foreground">{t('startHint')}</p>
        <div className="grid gap-1.5 sm:max-w-xs">
          <Label htmlFor="billing-payment-term">{t('termLabel')}</Label>
          <Input
            id="billing-payment-term"
            type="number"
            inputMode="numeric"
            min={0}
            max={90}
            name="paymentTermDays"
            defaultValue={settings.paymentTermDays}
            required
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={isPending || !isHydrated}>
            {t('save')}
          </Button>
          {state === 'saved' && (
            <span role="status" className="text-sm text-muted-foreground">
              {t('saved')}
            </span>
          )}
          {state === 'failed' && (
            <span role="alert" className="text-sm text-destructive">
              {t('saveFailed')}
            </span>
          )}
        </div>
      </form>
    </section>
  );
};
