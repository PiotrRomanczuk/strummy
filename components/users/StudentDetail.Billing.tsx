'use client';

import { useTranslations } from 'next-intl';

import { BillingBalance } from '@/components/billing/BillingBalance';
import type { StudentBilling } from '@/lib/services/billing/student-billing-queries';

import { StudentBillingLedger } from './StudentDetail.Billing.Ledger';
import { StudentBillingPurchases } from './StudentDetail.Billing.Purchases';
import { StudentBillingSell } from './StudentDetail.Billing.Sell';
import { Card, CardHeader } from './student-detail.shared';

type Props = { studentId: string; billing: StudentBilling };

/** Teacher's "Rozliczenia" tab: balance, selling a package, payments, history. */
export const StudentDetailBilling = ({ studentId, billing }: Props) => {
  const t = useTranslations('Billing');

  if (billing.hasLoadError) {
    return (
      <p
        role="alert"
        className="max-w-3xl text-sm text-destructive"
        data-testid="student-billing-error"
      >
        {t('loadFailed')}
      </p>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5" data-testid="student-billing">
      <Card>
        <CardHeader eyebrow={t('balanceEyebrow')} title={t('balanceTitle')} />
        <div className="px-6 pb-6 pt-4">
          <BillingBalance balance={billing.balance} />
          {!billing.isCounting && (
            <p className="mt-2 text-sm text-[var(--ink-3)]">{t('balanceNotCounting')}</p>
          )}
        </div>
      </Card>

      <StudentBillingSell studentId={studentId} packages={billing.packages} />
      <StudentBillingPurchases purchases={billing.purchases} />
      <StudentBillingLedger ledger={billing.ledger} />
    </div>
  );
};
