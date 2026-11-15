import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';

import { Card, CardHeader } from '@/components/dashboard/DashboardPrimitives';
import type { BillingSummary } from '@/lib/services/billing/family-billing.helpers';
import { formatBillingDay } from '@/lib/services/billing/billing-dates';
import { formatPln } from '@/lib/services/billing/package-price';

import { BillingBalance } from './BillingBalance';

type Props = {
  summary: BillingSummary | null;
  /** The family billing page — for a parent, with `?child=`. */
  href: string;
  /** Shown when billing was never used; without it the card is not rendered at all. */
  emptyNote?: string;
};

/** Home-screen card for a student or a parent: lessons left, what is due, a link to the details. */
export const BillingHomeCard = ({ summary, href, emptyNote }: Props) => {
  const t = useTranslations('Billing');
  const locale = useLocale();
  if (!summary && !emptyNote) return null;

  return (
    <Card>
      <CardHeader
        eyebrow={t('homeEyebrow')}
        title={t('homeTitle')}
        action={
          summary && (
            <Link href={href} className="text-sm text-[var(--gold-2)] hover:underline">
              {t('homeLink')}
            </Link>
          )
        }
      />
      <div className="px-6 pb-6 pt-4" data-testid="billing-home-card">
        {summary ? (
          <>
            <BillingBalance balance={summary.balance} className="text-[26px]" />
            {summary.openCount > 0 && (
              <p className="mt-2 text-sm text-[var(--ink-2)]">
                {t('homeOpen', { amount: formatPln(summary.openAmountCents, locale) })}
                {summary.nextDueOn &&
                  ` · ${t('dueOn', { date: formatBillingDay(summary.nextDueOn, locale) })}`}
              </p>
            )}
          </>
        ) : (
          <p className="font-[var(--serif)] text-sm italic text-[var(--ink-4)]">{emptyNote}</p>
        )}
      </div>
    </Card>
  );
};
