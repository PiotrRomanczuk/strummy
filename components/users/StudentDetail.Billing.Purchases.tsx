'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { cancelPackagePurchase, markPackagePurchasePaid } from '@/app/actions/billing-purchases';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useIsHydrated } from '@/hooks/useIsHydrated';
import { formatBillingDay } from '@/lib/services/billing/billing-dates';
import { formatPln } from '@/lib/services/billing/package-price';
import type { StudentPurchase } from '@/lib/services/billing/student-billing.helpers';
import { MANUAL_PAYMENT_METHODS, type ManualPaymentMethod } from '@/schemas/BillingSchema';

import { Card, CardHeader, Empty } from './student-detail.shared';

type Props = { purchases: StudentPurchase[] };

const STATUS_VARIANT = { pending: 'default', paid: 'secondary', cancelled: 'outline' } as const;

/** Sold packages, newest first. An unpaid one can be paid by hand or withdrawn. */
export const StudentBillingPurchases = ({ purchases }: Props) => {
  const t = useTranslations('Billing');
  const locale = useLocale();
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale);

  return (
    <Card>
      <CardHeader eyebrow={t('purchasesEyebrow')} title={t('purchasesTitle')} />
      {purchases.length === 0 ? (
        <Empty>{t('purchasesEmpty')}</Empty>
      ) : (
        <ul className="m-0 list-none divide-y divide-[var(--rule-2)] p-0">
          {purchases.map((purchase) => (
            <li key={purchase.id} className="px-6 py-4" data-testid="purchase-row">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-[var(--ink)]">
                  {purchase.description} · {t('packageLessons', { count: purchase.lessonCount })}
                </p>
                <Badge variant={STATUS_VARIANT[purchase.status]}>
                  {t(`purchaseStatus.${purchase.status}`)}
                </Badge>
              </div>
              <p className="mt-1 text-sm tabular-nums text-[var(--ink-3)]">
                {formatPln(purchase.amountCents, locale)} ·{' '}
                {t('soldOn', { date: date(purchase.createdAt) })}
                {purchase.status === 'pending' &&
                  purchase.dueOn &&
                  ` · ${t('dueOn', { date: formatBillingDay(purchase.dueOn, locale) })}`}
                {purchase.status === 'paid' &&
                  purchase.paidAt &&
                  ` · ${t('paidOn', { date: date(purchase.paidAt) })}`}
              </p>
              {purchase.status === 'pending' && <PendingActions purchaseId={purchase.id} />}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

/** "Wpłata" with how the money came, and "Anuluj" for a package never paid. */
const PendingActions = ({ purchaseId }: { purchaseId: string }) => {
  const t = useTranslations('Billing');
  const router = useRouter();
  const [method, setMethod] = useState<ManualPaymentMethod>('transfer');
  const [hasFailed, setHasFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  // A click before hydration would be lost silently; the buttons wait for React.
  const isHydrated = useIsHydrated();

  const run = (action: () => Promise<{ purchaseId: string } | { error: string }>) => {
    setHasFailed(false);
    startTransition(async () => {
      const result = await action();
      if ('error' in result) {
        setHasFailed(true);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <select
        aria-label={t('paymentMethodLabel')}
        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm dark:bg-input/30"
        value={method}
        onChange={(e) => setMethod(e.target.value as ManualPaymentMethod)}
      >
        {MANUAL_PAYMENT_METHODS.map((value) => (
          <option key={value} value={value}>
            {t(`paymentMethod.${value}`)}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        disabled={isPending || !isHydrated}
        onClick={() => run(() => markPackagePurchasePaid({ purchaseId, method }))}
        data-testid="purchase-mark-paid"
      >
        {t('markPaid')}
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={isPending || !isHydrated}
        onClick={() => run(() => cancelPackagePurchase({ purchaseId }))}
        data-testid="purchase-cancel"
      >
        {t('cancelPurchase')}
      </Button>
      {hasFailed && (
        <span role="alert" className="text-sm text-destructive">
          {t('saveFailed')}
        </span>
      )}
    </div>
  );
};
