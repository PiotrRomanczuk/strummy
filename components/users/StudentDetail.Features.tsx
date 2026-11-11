'use client';

import { useTransition, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { setStudentFeature } from '@/app/actions/student-features';
import { Switch } from '@/components/ui/switch';
import { STUDENT_FEATURES, type StudentFeature } from '@/lib/config/student-features';

import { Card, CardHeader } from './student-detail.shared';

type Props = { studentId: string; enabledFeatures: StudentFeature[] };

/** The teacher decides which optional features this student sees. */
export const StudentFeaturesCard = ({ studentId, enabledFeatures }: Props) => {
  const t = useTranslations('Users');
  const [enabled, setEnabled] = useState(enabledFeatures);
  const [isPending, startTransition] = useTransition();

  const toggle = (feature: StudentFeature, isEnabled: boolean) => {
    const previous = enabled;
    setEnabled(isEnabled ? [...enabled, feature] : enabled.filter((key) => key !== feature));
    startTransition(async () => {
      const result = await setStudentFeature({ studentId, feature, isEnabled });
      if (result.error) {
        setEnabled(previous);
        toast.error(t('detailFeaturesError'));
      }
    });
  };

  return (
    <Card>
      <CardHeader eyebrow={t('detailFeaturesEyebrow')} title={t('detailFeaturesTitle')} />
      <ul className="flex flex-col gap-3 px-6 pb-6">
        {STUDENT_FEATURES.map((feature) => (
          <li key={feature} className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--ink)]">
                {t(`detailFeature.${feature}.name`)}
              </p>
              <p className="text-xs text-[var(--ink-3)]">{t(`detailFeature.${feature}.hint`)}</p>
            </div>
            <Switch
              aria-label={t(`detailFeature.${feature}.name`)}
              checked={enabled.includes(feature)}
              disabled={isPending}
              onCheckedChange={(isEnabled) => toggle(feature, isEnabled)}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
};
