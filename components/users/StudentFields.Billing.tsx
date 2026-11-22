'use client';

import { useTranslations } from 'next-intl';

import { FormSection } from '@/components/shared/FormSection';
import {
  inputStyle,
  monoInputStyle,
  StudentField,
  type StudentSectionProps,
} from './student-fields.shared';

/**
 * Section IV — Billing & notes: rate per lesson (zł; overrides the price list
 * when a package is sold), goals/notes.
 */
export const StudentFieldsBilling = ({ values, onChange, errors }: StudentSectionProps) => {
  const t = useTranslations('Users');
  const populated = [values.lessonRate, values.goals].filter((v) => v && v.trim()).length;

  return (
    <FormSection
      numeral={t('fieldsBillingNumeral')}
      title={t('fieldsBillingTitle')}
      count={2}
      populated={populated}
    >
      <div className="mb-4 max-w-xs">
        <StudentField label={t('fieldsBillingRateLabel')} error={errors?.lessonRate}>
          <div className="relative">
            <input
              inputMode="decimal"
              value={values.lessonRate}
              onChange={(e) => onChange('lessonRate', e.target.value)}
              placeholder="120"
              style={{ ...monoInputStyle, paddingRight: 34 }}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--ink-4)]">
              zł
            </span>
          </div>
        </StudentField>
      </div>

      <StudentField label={t('fieldsBillingGoalsLabel')} hint={t('fieldsBillingGoalsHint')}>
        <textarea
          value={values.goals}
          onChange={(e) => onChange('goals', e.target.value)}
          placeholder={t('fieldsBillingGoalsPlaceholder')}
          maxLength={5000}
          style={{ ...inputStyle, minHeight: 90, resize: 'vertical', lineHeight: 1.5 }}
        />
      </StudentField>
    </FormSection>
  );
};
