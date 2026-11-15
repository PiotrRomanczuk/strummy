import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { saveLessonPackage } from '@/app/actions/billing-settings';
import { parsePlnToCents } from '@/lib/services/billing/package-price';
import type { LessonPackage } from '@/lib/services/billing/billing-queries';

/**
 * Submit of the package form: add when `pkg` is absent, edit otherwise. The
 * inputs are uncontrolled and read on submit, so a value typed before
 * hydration survives it.
 */
export function usePackageForm(pkg: LessonPackage | undefined, onDone?: () => void) {
  const t = useTranslations('Billing');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const price = String(fields.get('price') ?? '');
    if (parsePlnToCents(price) === null) {
      setError(t('invalidPrice'));
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveLessonPackage({
        id: pkg?.id,
        name: String(fields.get('name') ?? ''),
        lessonCount: String(fields.get('lessonCount') ?? ''),
        price,
      });
      if ('error' in result) {
        setError(t('saveFailed'));
        return;
      }
      if (!pkg) form.reset();
      router.refresh();
      onDone?.();
    });
  };

  return { error, clearError: () => setError(null), isPending, submit };
}
