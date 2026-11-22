import { useLocale, useTranslations } from 'next-intl';

import { Card, CardHeader } from '@/components/dashboard/DashboardPrimitives';
import { formatBillingDay } from '@/lib/services/billing/billing-dates';
import { formatPln } from '@/lib/services/billing/package-price';
import type { StudentPurchase } from '@/lib/services/billing/student-billing.helpers';

type Props = { open: StudentPurchase[] };

/** Packages issued and not paid yet, each with its amount, due date and — once inFakt issues one — a pay link. */
export const FamilyBillingOpen = ({ open }: Props) => {
  const t = useTranslations('Billing');
  const locale = useLocale();
  if (open.length === 0) return null;

  return (
    <Card>
      <CardHeader eyebrow={t('familyOpenEyebrow')} title={t('familyOpenTitle')} />
      <ul className="m-0 list-none divide-y divide-[var(--rule-2)] p-0">
        {open.map((purchase) => (
          <li
            key={purchase.id}
            className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            data-testid="family-open-purchase"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--ink)]">
                {purchase.description} · {t('packageLessons', { count: purchase.lessonCount })}
              </p>
              <p className="mt-1 text-sm tabular-nums text-[var(--ink-3)]">
                {formatPln(purchase.amountCents, locale)}
                {purchase.dueOn &&
                  ` · ${t('dueOn', { date: formatBillingDay(purchase.dueOn, locale) })}`}
              </p>
            </div>
            {purchase.paymentUrl ? (
              <a
                href={purchase.paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t('familyPay')}
              </a>
            ) : (
              <p className="max-w-xs text-xs text-[var(--ink-4)]">{t('familyPayOffline')}</p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
};
