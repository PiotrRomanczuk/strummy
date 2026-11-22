'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { createPackagePurchase } from '@/app/actions/billing-purchases';
import { Button } from '@/components/ui/button';
import { useIsHydrated } from '@/hooks/useIsHydrated';
import { Label } from '@/components/ui/label';
import { formatPln } from '@/lib/services/billing/package-price';
import type { SellablePackage } from '@/lib/services/billing/student-billing-queries';

import { Card, CardHeader } from './student-detail.shared';

type Props = { studentId: string; packages: SellablePackage[] };

const SELECT_CLASS =
  'h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 text-sm dark:bg-input/30';

/** Pick a package from the price list and sell it to this student. */
export const StudentBillingSell = ({ studentId, packages }: Props) => {
  const t = useTranslations('Billing');
  const locale = useLocale();
  const router = useRouter();
  const [packageId, setPackageId] = useState(packages[0]?.id ?? '');
  const [hasFailed, setHasFailed] = useState(false);
  const [isPending, startTransition] = useTransition();
  // A click before hydration would be lost silently; the buttons wait for React.
  const isHydrated = useIsHydrated();

  const sell = () => {
    setHasFailed(false);
    startTransition(async () => {
      const result = await createPackagePurchase({ studentId, packageId });
      if ('error' in result) {
        setHasFailed(true);
        return;
      }
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader eyebrow={t('sellEyebrow')} title={t('sellTitle')} />
      <div className="px-6 pb-6 pt-4">
        {packages.length === 0 ? (
          <p className="text-sm text-[var(--ink-3)]">
            {t('sellNoPackages')}{' '}
            <Link href="/dashboard/settings?tab=billing" className="underline">
              {t('sellNoPackagesLink')}
            </Link>
          </p>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="sell-package">{t('sellPackageLabel')}</Label>
              <select
                id="sell-package"
                className={SELECT_CLASS}
                value={packageId}
                onChange={(e) => setPackageId(e.target.value)}
              >
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} · {t('packageLessons', { count: pkg.lessonCount })} ·{' '}
                    {formatPln(pkg.priceCents, locale)}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={sell} disabled={isPending || !packageId || !isHydrated} data-testid="sell-package">
              {t('sellAction')}
            </Button>
          </div>
        )}
        {hasFailed && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {t('saveFailed')}
          </p>
        )}
        <p className="mt-3 text-xs text-[var(--ink-4)]">{t('sellRateHint')}</p>
      </div>
    </Card>
  );
};
