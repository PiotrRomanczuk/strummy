'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { setLessonPackageActive } from '@/app/actions/billing-settings';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPln } from '@/lib/services/billing/package-price';
import type { LessonPackage } from '@/lib/services/billing/billing-queries';

import { BillingSettingsPackageForm } from './BillingSettings.PackageForm';

type Props = { packages: LessonPackage[] };

/** The price list: every package with edit and on/off, then the form for a new one. */
export const BillingSettingsPackages = ({ packages }: Props) => {
  const t = useTranslations('Billing');
  const locale = useLocale();
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = (pkg: LessonPackage) => {
    setFailedId(null);
    startTransition(async () => {
      const result = await setLessonPackageActive(pkg.id, !pkg.isActive);
      if ('error' in result) {
        setFailedId(pkg.id);
        return;
      }
      router.refresh();
    });
  };

  return (
    <section className="rounded-xl border border-border bg-card" data-testid="billing-packages">
      <div className="border-b border-border px-5 py-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {t('priceListEyebrow')}
        </p>
        <h2 className="text-lg font-semibold tracking-tight">{t('priceListTitle')}</h2>
      </div>

      {packages.length === 0 ? (
        <p className="px-5 py-4 text-sm text-muted-foreground">{t('priceListEmpty')}</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-border p-0">
          {packages.map((pkg) => (
            <li key={pkg.id} className="px-5 py-3" data-testid="billing-package-row">
              {editingId === pkg.id ? (
                <BillingSettingsPackageForm pkg={pkg} onDone={() => setEditingId(null)} />
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate text-sm font-medium">
                      {pkg.name}
                      {!pkg.isActive && <Badge variant="secondary">{t('packageInactive')}</Badge>}
                    </p>
                    <p className="text-sm tabular-nums text-muted-foreground">
                      {t('packageLessons', { count: pkg.lessonCount })} ·{' '}
                      {formatPln(pkg.priceCents, locale)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setEditingId(pkg.id)}>
                      {t('edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => toggle(pkg)}
                    >
                      {pkg.isActive ? t('switchOff') : t('switchOn')}
                    </Button>
                  </div>
                </div>
              )}
              {failedId === pkg.id && (
                <p role="alert" className="mt-1 text-sm text-destructive">
                  {t('saveFailed')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border px-5 py-4">
        <h3 className="mb-3 text-sm font-medium">{t('addTitle')}</h3>
        <BillingSettingsPackageForm />
      </div>
    </section>
  );
};
