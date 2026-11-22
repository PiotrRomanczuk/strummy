import { useLocale, useTranslations } from 'next-intl';

import { Card, CardHeader } from '@/components/dashboard/DashboardPrimitives';
import type { PriceListItem } from '@/lib/services/billing/family-billing-queries';
import { formatPln } from '@/lib/services/billing/package-price';

type Props = { priceList: PriceListItem[] };

/** The teacher's packages at this student's price. Read-only: the teacher issues a package. */
export const FamilyBillingPriceList = ({ priceList }: Props) => {
  const t = useTranslations('Billing');
  const locale = useLocale();
  if (priceList.length === 0) return null;

  return (
    <Card>
      <CardHeader eyebrow={t('familyPriceListEyebrow')} title={t('familyPriceListTitle')} />
      <ul className="m-0 list-none divide-y divide-[var(--rule-2)] p-0">
        {priceList.map((item) => (
          <li key={item.id} className="flex items-baseline justify-between gap-4 px-6 py-3">
            <span className="min-w-0 text-sm text-[var(--ink-2)]">
              {item.name} · {t('packageLessons', { count: item.lessonCount })}
            </span>
            <span className="shrink-0 text-sm font-medium tabular-nums text-[var(--ink)]">
              {formatPln(item.priceCents, locale)}
            </span>
          </li>
        ))}
      </ul>
      <p className="px-6 pb-5 pt-1 text-xs text-[var(--ink-4)]">{t('familyPriceListHint')}</p>
    </Card>
  );
};
