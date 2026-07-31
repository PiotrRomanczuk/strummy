'use client';

import { useTranslations } from 'next-intl';

import { FormSection } from '@/components/shared/FormSection';
import {
  BILLING_CYCLE_LABELS,
  BILLING_CYCLES,
  type BillingCycle,
} from '@/schemas/StudentIntakeSchema';

import {
  inputStyle,
  monoInputStyle,
  StudentField,
  type StudentSectionProps,
} from './StudentFields.shared';

/**
 * Section IV — Billing & notes: rate per lesson, billing cycle, goals/notes.
 * BILLING is a new product surface — see the migration header + agent report.
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
      <div className="ui-form-row-2" style={{ marginBottom: 16 }}>
        <StudentField label={t('fieldsBillingRateLabel')} error={errors?.lessonRate}>
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-4)',
                fontSize: 13,
              }}
            >
              $
            </span>
            <input
              inputMode="decimal"
              value={values.lessonRate}
              onChange={(e) => onChange('lessonRate', e.target.value)}
              placeholder="65"
              style={{ ...monoInputStyle, paddingLeft: 22 }}
            />
          </div>
        </StudentField>
        <StudentField label={t('fieldsBillingCycleLabel')}>
          <select
            value={values.billingCycle}
            onChange={(e) => onChange('billingCycle', e.target.value as BillingCycle)}
            style={inputStyle}
          >
            {BILLING_CYCLES.map((c) => (
              <option key={c} value={c}>
                {BILLING_CYCLE_LABELS[c]}
              </option>
            ))}
          </select>
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
