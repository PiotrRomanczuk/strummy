'use client';

import { useTranslations } from 'next-intl';

import type { StudentBilling } from '@/lib/services/billing/student-billing-queries';
import { balanceState } from '@/lib/services/billing/student-billing.helpers';

import { StudentBillingLedger } from './StudentDetail.Billing.Ledger';
import { StudentBillingPurchases } from './StudentDetail.Billing.Purchases';
import { StudentBillingSell } from './StudentDetail.Billing.Sell';
import { Card, CardHeader } from './student-detail.shared';

type Props = { studentId: string; billing: StudentBilling };

/** Teacher's "Rozliczenia" tab: balance, selling a package, payments, history. */
export const StudentDetailBilling = ({ studentId, billing }: Props) => {
  const t = useTranslations('Billing');
  const state = balanceState(billing.balance);

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
          <p
            className={`font-[var(--serif)] text-[32px] leading-tight ${
              state.kind === 'due' ? 'text-destructive' : 'text-[var(--ink)]'
            }`}
            data-testid="student-billing-balance"
            data-balance={billing.balance}
          >
            {state.kind === 'credit' && t('balanceCredit', { count: state.lessons })}
            {state.kind === 'zero' && t('balanceZero')}
            {state.kind === 'due' && t('balanceDue', { count: state.lessons })}
          </p>
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
