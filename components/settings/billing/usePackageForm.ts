import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { saveLessonPackage } from '@/app/actions/billing-settings';
import { centsToPlnInput, parsePlnToCents } from '@/lib/services/billing/package-price';
import type { LessonPackage } from '@/lib/services/billing/billing-queries';

/** State and submit of the package form: add when `pkg` is absent, edit otherwise. */
export function usePackageForm(pkg: LessonPackage | undefined, onDone?: () => void) {
  const t = useTranslations('Billing');
  const router = useRouter();
  const [name, setName] = useState(pkg?.name ?? '');
  const [lessonCount, setLessonCount] = useState(pkg ? String(pkg.lessonCount) : '4');
  const [price, setPrice] = useState(pkg ? centsToPlnInput(pkg.priceCents) : '');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const changePrice = (value: string) => {
    setPrice(value);
    setError(null);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (parsePlnToCents(price) === null) {
      setError(t('invalidPrice'));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveLessonPackage({ id: pkg?.id, name, lessonCount, price });
      if ('error' in result) {
        setError(t('saveFailed'));
        return;
      }
      if (!pkg) {
        setName('');
        setPrice('');
      }
      router.refresh();
      onDone?.();
    });
  };

  return {
    name,
    setName,
    lessonCount,
    setLessonCount,
    price,
    changePrice,
    error,
    isPending,
    submit,
  };
}
