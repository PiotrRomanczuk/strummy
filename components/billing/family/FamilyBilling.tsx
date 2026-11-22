import { useTranslations } from 'next-intl';

import { Card, CardHeader } from '@/components/dashboard/DashboardPrimitives';
import type { FamilyBilling as FamilyBillingData } from '@/lib/services/billing/family-billing-queries';
import { openPurchases } from '@/lib/services/billing/family-billing.helpers';

import { BillingBalance } from '../BillingBalance';
import { BillingLedgerList } from '../BillingLedgerList';
import { FamilyBillingOpen } from './FamilyBilling.Open';
import { FamilyBillingPriceList } from './FamilyBilling.PriceList';

type Props = { billing: FamilyBillingData };

/**
 * A student's — or a parent's — billing: lessons left or owed, packages to pay,
 * the price list and every change to the balance. Read-only; the teacher sells
 * packages and records payments.
 */
export const FamilyBilling = ({ billing }: Props) => {
  const t = useTranslations('Billing');

  if (!billing.hasActivity && billing.priceList.length === 0) {
    return (
      <Card>
        <p
          className="px-6 py-8 text-center font-[var(--serif)] text-base italic text-[var(--ink-3)]"
          data-testid="family-billing-empty"
        >
          {t('familyEmpty')}
        </p>
      </Card>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5" data-testid="family-billing">
      <Card>
        <CardHeader eyebrow={t('balanceEyebrow')} title={t('balanceTitle')} />
        <div className="px-6 pb-6 pt-4">
          <BillingBalance balance={billing.balance} />
          {billing.balance < 0 && (
            <p className="mt-2 text-sm text-[var(--ink-3)]">{t('familyDueHint')}</p>
          )}
        </div>
      </Card>
      <FamilyBillingOpen open={openPurchases(billing.purchases)} />
      <FamilyBillingPriceList priceList={billing.priceList} />
      <Card>
        <CardHeader eyebrow={t('ledgerEyebrow')} title={t('ledgerTitle')} />
        <BillingLedgerList ledger={billing.ledger} emptyNote={t('ledgerEmpty')} />
      </Card>
    </div>
  );
};
