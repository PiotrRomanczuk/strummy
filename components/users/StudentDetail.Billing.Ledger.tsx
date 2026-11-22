'use client';

import { useTranslations } from 'next-intl';

import { BillingLedgerList } from '@/components/billing/BillingLedgerList';
import type { LedgerEntry } from '@/lib/services/billing/student-billing.helpers';

import { Card, CardHeader } from './student-detail.shared';

type Props = { ledger: LedgerEntry[] };

/** The teacher's view of a student's balance history. */
export const StudentBillingLedger = ({ ledger }: Props) => {
  const t = useTranslations('Billing');
  return (
    <Card>
      <CardHeader eyebrow={t('ledgerEyebrow')} title={t('ledgerTitle')} />
      <BillingLedgerList ledger={ledger} emptyNote={t('ledgerEmpty')} />
    </Card>
  );
};
